// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { satteriKatex } from 'satteri-katex';
import { satteriSlug } from 'satteri-slug';
import { satteriAutolinkHeadings } from 'satteri-autolink-headings';

/*
 * The satteri-* plugins return the wide `Mdast/HastPluginEntry` union (which
 * also covers factories and conditional `false`), but @astrojs/markdown-satteri
 * 0.3.7 types its options as the strict `…PluginDefinition[]`. Satteri's own
 * `normalizePlugins` accepts the union, so this is only the option type being
 * too narrow — these casts assert what the runtime already guarantees. Drop
 * them once Astro widens the types.
 */
const mdastPlugins = /** @type {import('satteri').MdastPluginDefinition[]} */ ([
  satteriKatex({
    macros: {
      '\\ket': '\\left|#1\\right\\rangle',
      '\\bra': '\\left\\langle#1\\right|',
      '\\braket': '\\left\\langle#1\\middle|#2\\right\\rangle',
      '\\dd': '\\mathrm{d}',
    },
  }),
]);

// satteriSlug must precede satteriAutolinkHeadings: Astro appends its own
// heading-id plugin *after* user HAST plugins, so without it every heading is
// still id-less when the autolinker runs and every anchor is skipped.
const hastPlugins = /** @type {import('satteri').HastPluginDefinition[]} */ ([
  satteriSlug(),
  satteriAutolinkHeadings({ behavior: 'wrap' }),
]);

// https://astro.build/config
export default defineConfig({
  site: 'https://dschneidinger.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: satteri({
      // Required: without it Sätteri never emits math nodes for satteri-katex.
      features: { math: true },
      // MDAST, not HAST — Astro's syntax highlighter runs ahead of user HAST
      // plugins and would claim `$$…$$` as a plaintext code block first.
      mdastPlugins,
      hastPlugins,
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
