import { getPageNodes } from '../scraper'

export async function getMeta(url: string) {
  let result = await getPageNodes({
    url,
    notFound: '',
    mapping: {
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  result = result.meta

  return result
}
