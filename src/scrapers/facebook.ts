import { getPageNodes } from '../scraper'

export async function getFacebookEvent(url: string) {
  let result = await getPageNodes({
    url,
    mapping: {
      name: '[data-testid=event-permalink-event-name]',
      description: '._63ew',
      image: '#event_header_primary img|src',
      hostLink: '#title_subtitle a|href',
      hostName: '#title_subtitle a',
      date: '#event_time_info td|eq(1)|content',
      address: '.uiGrid td|eq(3)|trim(\nShow Map)',
      tickets: '.uiGrid td|eq(5)|href',
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  let alt = result

  if (result.meta) {
    result = result.meta
  }

  if (alt.tickets) {
    result.tickets = alt.tickets
  }

  if (alt.hostLink) {
    result.hostLink = alt.hostLink
  }

  if (alt.hostName) {
    result.hostName = alt.hostName
  }

  if (!result.startDate) {
    const [startDate, endDate] = alt.date.split(' to ')

    result.startDate = startDate
    result.endDate = endDate
  }

  delete result.date

  result.online = false

  if (alt.address === 'Online Event') {
    result.online = true
  }

  result.id = url.split('/').pop()

  result.facebook = result.url

  delete result.url

  result.source = 'facebook.com'

  return result
}
