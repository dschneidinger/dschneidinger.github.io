import { getCollection } from 'astro:content';

/** Drafts stay visible while writing, and disappear from the built site. */
const isVisible = (entry: { data: { draft: boolean } }) =>
  import.meta.env.PROD ? !entry.data.draft : true;

export const getEssays = async () =>
  (await getCollection('essays', isVisible)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

export const getNotes = async () =>
  (await getCollection('notes', isVisible)).sort(
    (a, b) => b.data.updated.valueOf() - a.data.updated.valueOf(),
  );

export const getProjects = async () =>
  (await getCollection('projects', isVisible)).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );


/** Shared date formatting, so every section reads the same way. */
export const formatDate = (date: Date, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
    ...opts,
  }).format(date);


export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
