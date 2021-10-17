import * as puppeteer from 'puppeteer'

let browser: puppeteer.Browser | null
let page: puppeteer.Page | null

export async function getBrowser() {
  const headless = Boolean(process.env.HEADLESS)

  if (!browser) {
    browser = await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
  }

  return browser
}

export async function getPage(url?: string) {
  if (!page) {
    const browser = await getBrowser()
    page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1080 })
  }

  if (url) {
    await page.goto(url, { waitUntil: 'networkidle0' })
  }

  return page
}

export async function finish() {
  ;(await getBrowser()).close()

  process.exit(0)
}
