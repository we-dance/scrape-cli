import { ScraperPlugin } from '../scraper'
import { getEventsFromCalendar } from '../utils/ical'
import { getUrlContentId } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'teamup.calendar',
  contentType: 'text/html',
  patterns: ['teamup.com'],
  getList: async (url: string): Promise<any[]> => {
    let result = []
    const calendarId = getUrlContentId(url)
    let events = await getEventsFromCalendar(
      `https://ics.teamup.com/feed/${calendarId}/0.ics`
    )

    result = events.map((event) => ({
      ...event,
      source: `teamup_ical_${calendarId}`,
    }))

    return result
  },
}
