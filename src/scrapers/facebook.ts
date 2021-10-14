import { getPageNodes } from '../scraper'

export async function getFacebookEvent(url: string) {
  const result = await getPageNodes({
    url,
    before: '[data-testid="cookie-policy-dialog-accept-button"]',
    notFound: '',
    mapping: {
      name: '[data-testid=event-permalink-event-name]',
      description: '._63ew',
      cover: '#event_header_primary img|src',
      hostLink: '#title_subtitle a|href',
      hostName: '#title_subtitle a',
      date: '#event_time_info td|eq(1)|content',
      address: '.uiGrid td|eq(3)|trim(\nShow Map)',
      tickets: '.uiGrid td|eq(5)|href',
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  if (result.date) {
    const [startDate, endDate] = result.date.split(' to ')

    result.startDate = startDate
    result.endDate = endDate
  }

  if (result.meta?.startDate) {
    result.startDate = result.meta?.startDate
    result.endDate = result.meta?.endDate
  }

  delete result.date

  result.online = false

  if (result.address === 'Online Event') {
    result.online = true
  }

  result.source = url

  return result
}
