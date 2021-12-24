import * as cors from 'cors'
import * as express from 'express'
import { add } from './lib'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.post('/add', async (req: any, res: any) => {
  const job = await add(req.body.url, req.body.name, 'api')
  res.send(job?.data)
})

export default app
