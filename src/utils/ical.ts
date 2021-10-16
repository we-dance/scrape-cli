import * as ical from 'ical'
import axios from 'axios'

export async function getEventsFromCalendar(url: string) {
  const res = await axios(url)
  const events = []

  const data = ical.parseICS(res.data)
  for (const id in data) {
    events.push(data[id])
  }

  return events
}
