import * as puppeteer from 'puppeteer'
import config from '../config'
import { debug } from '../lib'
import chalk = require('chalk')

let browser: puppeteer.Browser | null
let page: puppeteer.Page | null

const pages: any = {}

export async function getBrowser() {
  const headless = Boolean(process.env.HEADLESS)

  if (!browser) {
    if (config.verbose > 2) {
      debug(chalk.gray(`[browser] starting`))
    }

    browser = await puppeteer.launch({
      executablePath: 'chromium',
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
  if (!url) {
    const browser = await getBrowser()
    page = await browser.newPage()
    return page
  }

  if (pages[url]) {
    if (config.verbose > 2) {
      debug(chalk.gray(`[browser] using ${url}`))
    }

    return pages[url]
  }

  const browser = await getBrowser()
  pages[url] = await browser.newPage()

  if (config.verbose > 2) {
    debug(chalk.gray(`[browser] opening ${url}`))
  }

  const response = await pages[url].goto(url, { waitUntil: 'networkidle0' })

  if (config.verbose > 2) {
    debug(chalk.gray(`[browser] response: ${response.status()}`))
  }

  return pages[url]
}

export async function finish() {
  if (config.verbose > 2) {
    debug(chalk.gray(`[browser] closing`))
  }

  ;(await getBrowser()).close()

  process.exit(0)
}
