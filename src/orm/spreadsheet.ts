import { google } from 'googleapis'
import * as fs from 'fs'
import { createInterface } from 'readline'
import config from '../config'
import { IDocRef, IQuery } from './orm'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = '/Users/razbakov/.config/scrape-cli/token.json'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (questionText: string) =>
  new Promise<string>((resolve) => rl.question(questionText, resolve)).finally(
    () => rl.close()
  )

// https://developers.google.com/sheets/api/quickstart/nodejs
export async function getAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    'http://localhost'
  )

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH).toString())
    oAuth2Client.setCredentials(token)
  } catch (e) {
    console.log('[Google Auth] Token not found')

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    })

    console.log('[Google Auth] Authorize this app by visiting this url:')
    console.log(authUrl)

    const code = await question(
      '[Google Auth] Enter the code from that page here: '
    )

    const res = await oAuth2Client.getToken(code)
    const token = res.tokens
    oAuth2Client.setCredentials(token)

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token))

    console.log('Token stored to', TOKEN_PATH)
  }

  return oAuth2Client
}

// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
// https://developers.google.com/sheets/api/samples/writing
export async function set(spreadsheetId: string, range: string, rows: any) {
  const auth = await getAuth()

  google.options({
    auth,
  })

  const sheets = google.sheets({ version: 'v4' })

  const values = []
  let line = 0

  for (const row of rows) {
    if (line === 0) {
      values.push(Object.keys(row))
    }

    values.push(
      Object.values(row).map((val) => {
        if (Array.isArray(val) || typeof val === 'object') {
          return JSON.stringify(val)
        }

        return val
      })
    )
    line++
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  })
}

export async function get(spreadsheetId: string, range: string) {
  const auth = await getAuth()

  google.options({
    auth,
  })

  const sheets = google.sheets({ version: 'v4' })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  if (!res.data.values) {
    return []
  }

  let line = 0
  const headers = res.data.values[0]
  const items = []

  for (const row of res.data.values) {
    if (line === 0) {
      line++
      continue
    }

    const item = {} as any

    for (let position = 0; position < headers.length; position++) {
      let val = row[position]

      if (val && ['[', '{'].includes(val[0])) {
        val = JSON.parse(val)
      }

      item[headers[position]] = val
    }

    items.push(item)
    line++
  }

  return items
}

const cache: any = {}

export class SpreadsheetRef implements IDocRef {
  async get(query: IQuery) {
    if (!cache[query.collection]) {
      cache[query.collection] = await get(
        config.googleSpreadsheetId,
        query.collection
      )
    }

    if (query.id) {
      return cache[query.collection].find((item: any) => item.id === query.id)
    }

    if (query.where) {
      console.log('[orm] query.where is not supported yet')
    }

    return cache[query.collection]
  }

  async set(query: IQuery) {
    if (!cache[query.collection]) {
      cache[query.collection] = []
    }

    const index = cache[query.collection].findIndex(
      (item: any) => item.id === query.id
    )

    if (index > -1) {
      cache[query.collection][index] = query.value
    } else {
      cache[query.collection].push(query.value)
    }

    await set(
      config.googleSpreadsheetId,
      query.collection,
      cache[query.collection]
    )
  }
}
