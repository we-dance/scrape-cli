import { getPage } from '../puppeteer/browser'
import { getPageNodes, ScraperPlugin } from '../scraper'

export const plugin: ScraperPlugin = {
  default: true,
  name: 'schema.meta',
  getList: async (url: string): Promise<any[]> => {
    const page = await getPage(url)

    const code = `[...document.querySelectorAll('[itemtype="http://schema.org/Event"]')].map(node => ({
      name: node.querySelector('[itemprop="name"]').textContent?.trim(),
      image: node.querySelector('[itemprop="image"]').src,
      startDate: node.querySelector('[itemprop="startDate"]').content,
      endDate: node.querySelector('[itemprop="endDate"]').content,
      url: node.querySelector('[itemprop="url"]').content,
      addressStreet: node.querySelector('[itemprop="location"] [itemprop="streetAddress"]').textContent,
      addressLocality: node.querySelector('[itemprop="location"] [itemprop="addressLocality"]').textContent,
      addressRegion: node.querySelector('[itemprop="location"] [itemprop="addressRegion"]').textContent,
      addressCountry: node.querySelector('[itemprop="location"] [itemprop="addressCountry"]').textContent,
      venue: node.querySelector('[itemprop="location"]').querySelector('[itemprop="name"]').textContent,
    }))`

    return await page.evaluate(code)
  },
  getItem: async (url: string) => {
    let result = await getPageNodes({
      url,
      mapping: {
        meta: 'script[type="application/ld+json"]|json',
      },
    })

    if (result?.meta) {
      result = result.meta
    }

    delete result.meta

    if (!result) {
      return null
    }

    if (result.hasOffers) {
      result.tickets = url
    }

    delete result.hasOffers

    return result
  },
}
