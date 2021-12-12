import * as cors from 'cors'
import * as express from 'express'
import { add } from './lib'

const app = express()

app.use(cors())

app.post('/add', async (req: any, res: any) => {
  try {
    await add(req.url, req.name, 'form')

    res.send({
      success: true,
    })
  } catch (error) {
    res.send({
      success: false,
      error,
    })
  }
})

export default app
