import app from './app'
import config from './config'

config.silent = true
config.verbose = 3

const port = config.port

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
