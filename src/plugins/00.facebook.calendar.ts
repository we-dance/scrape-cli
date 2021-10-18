import { ScraperPlugin } from '../scraper'
import { getEventsFromCalendar } from '../utils/ical'
import { getUrlContentId, getUrlParam } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'facebook.calendar',
  contentType: 'text/calendar',
  patterns: ['www.facebook.com/events/ical/upcoming'],
  getList: async (url: string): Promise<any[]> => {
    const result = []
    const events = await getEventsFromCalendar(url)
    const facebookUser = getUrlParam(url, 'uid')

    for (const vevent of events) {
      if (!vevent.uid) {
        continue
      }

      const event: any = {
        id: getUrlContentId(vevent.url),
        source: `facebook_ical_${facebookUser}`,
        name: vevent.summary,
        description: vevent.description,
        startDate: vevent.start,
        endDate: vevent.end,
        address: vevent.location,
        url: vevent.url,
        facebook: vevent.url,
      }

      result.push(event)
    }

    return result
  },
}
