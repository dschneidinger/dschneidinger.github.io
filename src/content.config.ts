import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tags = z.array(z.string()).default([]);

/** Dated long-form writing. Ordered by publication date. */
const essays = defineCollection({
  loader: glob({ base: './src/content/essays', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags,
    draft: z.boolean().default(false),
  }),
});

/** Evergreen notes. Organised by topic and maturity rather than date. */
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    maturity: z.enum(['seedling', 'growing', 'evergreen']).default('seedling'),
    tags,
    draft: z.boolean().default(false),
  }),
});

/** Projects, each linking out to where it lives. */
const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.url(),
    repo: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

const linkList = z.array(z.object({ href: z.string(), label: z.string() }));

/** Editable prose for the standalone pages: home, section intros, about, projects, 404. */
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

/** Site-wide settings, so the chrome is editable without touching components. */
const settings = defineCollection({
  loader: glob({ base: './src/content', pattern: 'site.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    nav: linkList,
    links: linkList,
  }),
});

export const collections = { essays, notes, projects, pages, settings };
