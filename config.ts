require('dotenv').config()

const config = {
  eventsDatabase: `${process.env.APP_EVENTS_DATABASE}`,
  usersDatabase: `${process.env.APP_USER_DATABASE}`,
  verbose: 0,
}

export default config
