import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://garage-trip.cz',
  output: 'static',
  integrations: [react(), sitemap()],
  env: {
    schema: {
      PUBLIC_API_BASE_URL: envField.string({ context: 'client', access: 'public', default: 'https://api.garage-trip.cz' }),
      PUBLIC_GA_ID: envField.string({ context: 'client', access: 'public', default: 'G-TF98L99080' }),
      PUBLIC_INIT_WS_URL: envField.string({ context: 'client', access: 'public', default: 'wss://init-cipher-7.garage-trip.cz/ws' }),
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: [
            'import'
          ],
        }
      }
    }
  }
});
