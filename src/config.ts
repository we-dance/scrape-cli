import 'dotenv/config'

const config = {
  eventsDatabase: `${process.env.APP_EVENTS_DATABASE}`,
  usersDatabase: `${process.env.APP_USER_DATABASE}`,
  verbose: 0,
  retry: false,
  silent: false,
  force: false,
  port: process.env.PORT || 3000,
  databaseDriver: process.env.DATABASE_DRIVER || 'filesystem',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseApiKey: process.env.SUPABASE_API_KEY || '',
}

export default config
