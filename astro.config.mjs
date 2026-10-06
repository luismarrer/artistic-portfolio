// @ts-check

import path from 'node:path';

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap'

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';
import { site } from './src/data/site.ts';

// https://astro.build/config
export default defineConfig({
  site: site.publicUrl,
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
  }
});
