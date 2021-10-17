import { getPageNodes } from '../scraper'
import { getUrlContentId, getUrlProvider } from '../utils/url'

export async function getMeta(url: string) {
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

  return result
}

export async function getEvent(url: string) {
  let result = await getMeta(url)

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

  if (result.hasOffers) {
    result.tickets = url
  }

  delete result.hasOffers

  if (!result.website) {
    result.website = url
  }

  result.id = getUrlContentId(url)
  result.source = getUrlProvider(url)
  result.url = url

  if (!result.startDate) {
    return null
  }

  return result
}
