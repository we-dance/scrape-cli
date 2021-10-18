import { getPageNodes, ScraperPlugin } from '../scraper'

export const plugin: ScraperPlugin = {
  name: 'facebook.event',
  contentType: 'text/html',
  patterns: ['facebook.com/events/', 'fb.me/e/', 'fb.com/events'],
  getItem: async (url: string) => {
    let result = await getPageNodes({
      url,
      mapping: {
        name: '[data-testid=event-permalink-event-name]',
        description: '._63ew',
        image: '#event_header_primary img|src',
        organiserFacebook: '#title_subtitle a|href',
        organiserName: '#title_subtitle a',
        date: '#event_time_info td|eq(1)|content',
        address: '.uiGrid td|eq(3)|trim(\nShow Map)',
        tickets: '.uiGrid td|eq(5)|href',
      },
    })

    if (!result) {
      return null
    }

    if (result.date) {
      const [startDate, endDate] = result.date.split(' to ')

      result.startDate = startDate
      result.endDate = endDate
    }

    delete result.date

    result.online = false

    if (result.address === 'Online Event') {
      result.online = true
    }

    return result
  },
}
