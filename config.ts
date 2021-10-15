require('dotenv').config()

export default {
  eventsPath: process.env.PATH_EVENTS,
  providersPath: process.env.PATH_PROVIDERS,
  profilesPath: process.env.PATH_PROFILES,
  jobsPath: process.env.PATH_JOBS,
}
