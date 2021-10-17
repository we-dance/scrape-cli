require('dotenv').config()

export default {
  eventsDatabase: `${process.env.APP_EVENTS_DATABASE}`,
  usersDatabase: `${process.env.APP_USER_DATABASE}`,
  verbose: false,
}
