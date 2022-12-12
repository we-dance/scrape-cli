# scrape-cli

> Import and tag events from websites: Schema Rich Snippets, Facebook, iCal

## Setup

1. [Install nvm](https://github.com/nvm-sh/nvm)
2. Run `nvm use`
3. Run `yarn install`
4. Create `.env` file with

```
HEADLESS=true
APP_EVENTS_DATABASE=../path-to-folder/events-database
NODE_TLS_REJECT_UNAUTHORIZED=0
PUPPETEER_EXECUTABLE_PATH=chromium
```

## Usage

Run `yarn cli help` to see all available commands

Run `yarn cli add <url>` where url is a link to a facebook event it will create a yml file under `events-database/facebook.com/event-id.yml`

## Troubleshooting

If you face problem in windows for puppeteer executable path like `Error: Failed to launch the browser process!`, then put the path of chrome.exe in puppeteer inside node_modules to make sure chrome in the path.

`for example: ./node_modules/puppeteer/.local-chromium/win64-848005/chrome-win/chrome.exe`
