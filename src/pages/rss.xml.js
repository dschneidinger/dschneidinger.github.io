import rss from '@astrojs/rss';
import { getEssays } from '../lib/content';
import { SITE } from '../lib/site';

export async function GET(context) {
  const essays = await getEssays();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: essays.map((essay) => ({
      title: essay.data.title,
      description: essay.data.description,
      pubDate: essay.data.pubDate,
      link: `/writing/${essay.id}/`,
      categories: [...essay.data.tags],
    })),
    customData: '<language>en</language>',
  });
}
