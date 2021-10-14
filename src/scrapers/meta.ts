import { getPageNodes } from '../scraper'

export async function getMeta(url: string) {
  let result = await getPageNodes({
    url,
    mapping: {
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  result = result.meta

  result.website = url
  result.source = 'websiteSchema'

  if (!result.startDate) {
    return null
  }

  return result
}
