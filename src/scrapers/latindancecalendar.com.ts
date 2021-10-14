import { getPageNodes } from '../scraper'

export async function getLatinDanceCalendarEvent(url: string) {
  const result = await getPageNodes({
    url,
    notFound: '',
    mapping: {
      name: '.page-title',
      description: '.see_more',
      cover: '.vevent img|src',
      address: '.location',
      website: '.outbound.website|href',
      facebook: '.event_link|href',
      startDate: '.value-title|title',
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  if (result.meta?.startDate) {
    result.startDate = result.meta?.startDate
    result.endDate = result.meta?.endDate
  }

  result.online = false
  result.source = url

  return result
}
