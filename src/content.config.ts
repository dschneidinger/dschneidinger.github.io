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

/** Notes on books and papers. */
const reading = defineCollection({
  loader: glob({ base: './src/content/reading', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    year: z.number().int().optional(),
    dateRead: z.coerce.date(),
    rating: z.number().int().min(1).max(5).optional(),
    link: z.url().optional(),
    description: z.string().optional(),
    tags,
    draft: z.boolean().default(false),
  }),
});

export const collections = { essays, notes, reading };
