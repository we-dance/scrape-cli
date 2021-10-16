import { getPageNodes } from '../scraper'
import { getUrlContentId, getUrlProvider } from '../utils/url'

export async function getMeta(url: string) {
  let result = await getPageNodes({
    url,
    mapping: {
      name: '[itemprop="name"]',
      description: '[itemprop="description"]',
      image: '[itemprop="image"]|src',
      venue: '[itemprop="location"] [itemprop="name"]',
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
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  let isMeta = false

  if (result?.meta) {
    result = result.meta
    isMeta = true
  }

  delete result.meta

  if (result) {
    result.parser = isMeta ? 'schema.meta' : 'schema.html'
  }

  return result
}

export async function getMetaEvent(url: string) {
  let result = await getMeta(url)

  if (!result) {
    return null
  }

  if (result.hasOffers) {
    result.tickets = url
  }

  delete result.hasOffers

  if (!result.website) {
    result.website = url
  }

  result.id = getUrlContentId(url)
  result.providerId = result.id
  result.provider = getUrlProvider(url)

  if (!result.startDate) {
    return null
  }

  return result
}
