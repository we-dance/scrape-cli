import { getPageNodes } from '../scraper'
import { getUrlContentId, getUrlProvider } from '../utils/url'

export async function getMeta(url: string) {
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

  if (result) {
    result.parser = 'schema.meta'
  }

  return result
}

export async function getEvent(url: string) {
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
  result.source = getUrlProvider(url)
  result.url = url

  if (!result.startDate) {
    return null
  }

  return result
}
