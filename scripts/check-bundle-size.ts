/**
 * Plan R1/R18: content pages load no JavaScript (apart from the tiny inline
 * theme script, which downloads nothing), and /app's JavaScript stays small.
 * Warns above 50 KB gzipped (the Slow 3G working target) and fails above
 * 150 KB (the hard ceiling). Run after `astro build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const WARN_KB = 50;
const FAIL_KB = 150;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

// The one exception on content pages: BaseLayout's small inline theme script, which
// downloads nothing and only sets light or dark before the page paints.
const THEME_SCRIPT = /<script id="theme-init">([\s\S]*?)<\/script>/i;
const THEME_SCRIPT_MAX_BYTES = 2048;

let failed = false;
for (const file of htmlFiles(DIST)) {
  const page = relative(DIST, file).replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const theme = html.match(THEME_SCRIPT);
  if (theme && Buffer.byteLength(theme[1]) > THEME_SCRIPT_MAX_BYTES) {
    console.error(`FAIL ${page}: the inline theme script is over ${THEME_SCRIPT_MAX_BYTES} bytes.`);
    failed = true;
  }
  const rest = html.replace(THEME_SCRIPT, '');
  const loadsScript = /<script\b/i.test(rest) || /<astro-island\b/i.test(rest);
  if (page !== 'app/index.html' && loadsScript) {
    console.error(`FAIL ${page} loads JavaScript; only /app may.`);
    failed = true;
  }
}

const jsFiles = readdirSync(join(DIST, '_astro')).filter((f) => f.endsWith('.js'));
let totalKb = 0;
for (const f of jsFiles) {
  const kb = gzipSync(readFileSync(join(DIST, '_astro', f))).length / 1024;
  totalKb += kb;
  console.log(`  ${f.padEnd(40)} ${kb.toFixed(1)} KB gzipped`);
}
console.log(`/app JavaScript total: ${totalKb.toFixed(1)} KB gzipped (target ${WARN_KB} KB, limit ${FAIL_KB} KB)`);
if (totalKb > FAIL_KB) {
  console.error(`FAIL /app JavaScript is over the ${FAIL_KB} KB limit.`);
  failed = true;
} else if (totalKb > WARN_KB) {
  console.warn(`WARN /app JavaScript is over the ${WARN_KB} KB Slow 3G target.`);
}
process.exit(failed ? 1 : 0);
