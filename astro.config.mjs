import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// The deploy base path: internal links go through withBase() in src/config/site.ts.
// Root links inside Markdown pages ("/app") get the base path from ProseLayout.
export default defineConfig({
  site: 'https://mosesoluwanifise.github.io',
  base: '/nourishscope',
  output: 'static',
  integrations: [preact()],
});
