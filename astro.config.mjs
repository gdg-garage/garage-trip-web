import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://garage-trip.cz',
  output: 'static',
  integrations: [react(), sitemap()],
});
