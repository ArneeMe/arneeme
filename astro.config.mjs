import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',

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