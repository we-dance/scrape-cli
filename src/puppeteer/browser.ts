import * as puppeteer from 'puppeteer'
import config from '../config'
import { debug } from '../lib'
import chalk = require('chalk')

let browser: puppeteer.Browser | null
let page: puppeteer.Page | null

export async function getBrowser() {
  const headless = Boolean(process.env.HEADLESS)

  if (!browser) {
    if (config.verbose > 2) {
      debug(chalk.gray(`[browser] starting`))
    }

    browser = await puppeteer.launch({
      executablePath: '/opt/homebrew/bin/chromium',
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
    if (config.verbose > 2) {
      debug(chalk.gray(`[browser] opening ${url}`))
    }

    const response = await page.goto(url, { waitUntil: 'networkidle0' })

    if (config.verbose > 2) {
      debug(chalk.gray(`[browser] response: ${response.status()}`))
    }
  }

  return page
}

export async function finish() {
  if (config.verbose > 2) {
    debug(chalk.gray(`[browser] closing`))
  }

  ;(await getBrowser()).close()

  process.exit(0)
}
