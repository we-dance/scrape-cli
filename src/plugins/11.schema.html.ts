import { getPage } from '../puppeteer/browser'
import { getPageNodes, ScraperPlugin } from '../scraper'

export const plugin: ScraperPlugin = {
  contentType: 'text/html',
  name: 'schema.html',
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
        name: '[itemprop="name"]',
        description: '[itemprop="description"]',
        image: '[itemprop="image"]|src',
        locationName: '[itemprop="location"] [itemprop="name"]',
        addressStreet: '[itemprop="location"] [itemprop="streetAddress"]',
        addressLocality: '[itemprop="location"] [itemprop="addressLocality"]',
        addressRegion: '[itemprop="location"] [itemprop="addressRegion"]',
        addressCountry:
          '[itemprop="location"] [itemprop="addressCountry"]|content',
        startDate: '[itemprop="startDate"]|content',
        endDate: '[itemprop="endDate"]|content',
        hasOffers: '[itemprop="offers"]|bool',
        website: '[data-ga-action="contact-web"]|href',
        facebook: '[data-ga-action="contact-facebook"]|href',
      },
    })

    if (result) {
      result.parser = 'schema.html'
    }

    if (!result) {
      return null
    }

    result.location = {
      address: {
        addressCountry: result.addressCountry,
        addressLocality: result.addressLocality,
        addressRegion: result.addressRegion,
        streetAddress: result.streetAddress,
        postalCode: result.postalCode,
      },
      name: result.locationName,
    }

    delete result.addressCountry
    delete result.addressLocality
    delete result.addressRegion
    delete result.streetAddress
    delete result.postalCode
    delete result.locationName

    return result
  },
}
