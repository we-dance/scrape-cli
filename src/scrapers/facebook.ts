import { getPageNodes } from '../scraper'
import { getUrlContentId } from '../utils/url'

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

  if (!result) {
    return null
  }

  let alt = result

  if (result.meta) {
    result = result.meta
    result.parser = 'schema.meta.facebook'
    delete result.meta
  } else {
    result.parser = 'facebook.com'
  }

  if (alt.image) {
    result.bigImage = alt.image
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

  if (!result.startDate && alt.date) {
    const [startDate, endDate] = alt.date.split(' to ')

    result.startDate = startDate
    result.endDate = endDate
  }

  delete result.date

  result.online = false

  if (alt.address === 'Online Event') {
    result.online = true
  }

  if (result.url) {
    result.facebook = result.url
    result.id = getUrlContentId(result.facebook)

    delete result.url
  }

  result.source = 'facebook.com'

  if (!result.startDate) {
    return null
  }

  return result
}
