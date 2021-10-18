import { ScraperPlugin } from '../scraper'
import { getEventsFromCalendar } from '../utils/ical'
import { getUrlParam } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'google.calendar',
  contentType: 'text/html',
  patterns: ['calendar.google.com'],
  getList: async (url: string): Promise<any[]> => {
    let result = []
    const calendarId = getUrlParam(url, 'src')
    let events = await getEventsFromCalendar(
      `https://calendar.google.com/calendar/ical/${calendarId}/public/basic.ics`
    )

    result = events.map((event) => ({
      ...event,
      source: `google_ical_${calendarId}`,
    }))

    console.log('total', result.length)

    return result
  },
}
