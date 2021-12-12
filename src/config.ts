import 'dotenv/config'

const config = {
  eventsDatabase: `${process.env.APP_EVENTS_DATABASE}`,
  usersDatabase: `${process.env.APP_USER_DATABASE}`,
  verbose: 0,
  retry: false,
  force: false,
  port: process.env.PORT || 3000,
}

export default config
