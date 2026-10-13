import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Keep site/base in sync with SITE_ORIGIN and BASE_PATH in src/config/site.ts.
export default defineConfig({
  site: 'https://mosesoluwanifise.github.io',
  base: '/nourishscope',
  output: 'static',
  integrations: [preact()],
});
