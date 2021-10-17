import { getPageNodes } from '../scraper'
import { getUrlContentId, getUrlProvider } from '../utils/url'

export async function getLatinDanceCalendarEvent(url: string) {
  const result = await getPageNodes({
    url,
    mapping: {
      name: '.page-title',
      description: '.see_more',
      cover: '.vevent img|src',
      address: '.location',
      website: '.outbound.website|href',
      facebook: '.event_link|href',
      startDate: '.value-title|title',
    },
  })

  result.id = getUrlContentId(url)
  result.source = getUrlProvider(url)
  result.url = url

  return result
}
