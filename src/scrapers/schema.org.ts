import { getPageNodes } from '../scraper'
import { getUrlContentId, getUrlProvider } from '../utils/url'

export async function getMeta(url: string) {
  let result = await getPageNodes({
    url,
    mapping: {
      name: '[itemprop="name"]',
      description: '[itemprop="description"]',
      cover: '[itemprop="image"]|src',
      address: '[itemprop="location"]',
      startDate: '[itemprop="startDate"]|content',
      endDate: '[itemprop="endDate"]|content',
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  let isMeta = false

  if (!result) {
    return null
  }

  if (result?.meta) {
    result = result.meta
    isMeta = true
    delete result.meta
  }

  result.website = url
  result.id = getUrlContentId(url)
  result.providerId = result.id
  result.provider = getUrlProvider(url)
  result.parser = isMeta ? 'schema.meta' : 'schema.html'

  if (!result.startDate) {
    return null
  }

  return result
}
