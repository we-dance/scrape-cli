require('dotenv').config()

export default {
  eventsPath: process.env.PATH_EVENTS,
  collectionsPaths: process.env.PATH_COLLECTIONS,
  profilesPath: process.env.PATH_PROFILES,
}
