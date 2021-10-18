import { ScraperPlugin } from '../scraper'
import { getEventsFromCalendar } from '../utils/ical'
import { getUrlContentId, getUrlParam } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'facebook.calendar',
  contentType: 'text/calendar',
  patterns: ['www.facebook.com/events/ical/upcoming'],
  getList: async (url: string): Promise<any[]> => {
    let result = []
    let events = await getEventsFromCalendar(url)
    const facebookUser = getUrlParam(url, 'uid')

    result = events.map((event) => ({
      ...event,
      id: getUrlContentId(event.url),
      source: `facebook_ical_${facebookUser}`,
      facebook: event.url,
    }))

    return result
  },
}
