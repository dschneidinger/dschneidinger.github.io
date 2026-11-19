import { getEntry, type CollectionEntry } from 'astro:content';

/**
 * Site chrome and page prose both live in Markdown under src/content/, so
 * everyday edits never touch a component. These loaders fail loudly rather
 * than rendering a half-empty page when a file is missing.
 */

export async function getSite(): Promise<CollectionEntry<'settings'>['data']> {
  const entry = await getEntry('settings', 'site');
  if (!entry) throw new Error('Missing src/content/site.md — site settings live there.');
  return entry.data;
}

export type PageId =
  | 'home'
  | 'writing'
  | 'notes'
  | 'about'
  | 'projects'
  | 'not-found';

export async function getPage(id: PageId): Promise<CollectionEntry<'pages'>> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Missing src/content/pages/${id}.md`);
  return entry;
}
