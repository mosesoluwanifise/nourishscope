import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// The site is served from its own domain, nourishscope.app, at the root. Internal links still
// go through withBase() in src/config/site.ts, and root links inside Markdown pages ("/app")
// through ProseLayout, so moving to a sub-path again only means changing `base` here.
export default defineConfig({
  site: 'https://nourishscope.app',
  base: '/',
  output: 'static',
  integrations: [preact()],
});
