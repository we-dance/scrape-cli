import * as puppeteer from 'puppeteer'

async function getBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

export async function getEvent(id: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const url = `https://www.facebook.com/events/${id}`

  await page.goto(url)
  await page.waitForNavigation()

  const eventNameElement = await page.evaluate(() =>
    document.querySelector('[data-testid=event-permalink-event-name]')
  )

  if (!eventNameElement) {
    throw new Error('Event not found')
  }

  const more = await page.$$('.see_more_link')

  if (more) {
    console.log('Clicked more')
    await page.click('.see_more_link')
  }

  console.log(id)
}
