import * as ical from 'ical'
import axios from 'axios'

function getUrlFromText(text: string): string {
  const result =
    text.match(/\bhttps?::\/\/\S+/gi) || text.match(/\bhttps?:\/\/\S+/gi)

  if (result) {
    return result[0]
  }

  return ''
}

export async function getEventsFromCalendar(url: string) {
  const res = await axios(url)
  const events = []

  const data = ical.parseICS(res.data)

  for (const id in data) {
    const vevent = data[id]

    if (!vevent.uid) {
      continue
    }

    const event: any = {
      id: vevent.uid,
      source: `ical`,
      name: vevent.summary,
      description: vevent.description,
      startDate: vevent.start,
      endDate: vevent.end,
      address: vevent.location,
      url: vevent.url || getUrlFromText(vevent.description || ''),
    }

    events.push(event)
  }

  return events
}
