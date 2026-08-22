import rss from '@astrojs/rss';
import { getEssays } from '../lib/content';
import { getSite } from '../lib/site';

export async function GET(context) {
  const [site, essays] = await Promise.all([getSite(), getEssays()]);

  return rss({
    title: site.title,
    description: site.description,
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
