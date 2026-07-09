import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://arnee.me',
  output: 'static',

  integrations: [preact()],

  vite: {
    plugins: [tailwindcss()],
  },

  session: {
    driver: {
      name: 'memory',
      entrypoint: 'astro/cache/memory',
    },
  },

  adapter: cloudflare(),
});