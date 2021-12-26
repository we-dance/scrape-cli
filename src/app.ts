import * as cors from 'cors'
import * as express from 'express'
import { Provider } from './entity/provider'
import { add, pull, sync } from './lib'
import { getRepository } from './orm/orm'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.post('/add', async (req: any, res: any) => {
  await add(req.body.url, req.body.name, 'api')
  res.send({ status: 'ok' })
})

app.post('/sync', async (req: any, res: any) => {
  const provider = await getRepository(Provider).findOne(req.body.provider)
  await sync(provider)
  res.send({ status: 'ok' })
})

app.post('/pull', async (req: any, res: any) => {
  const provider = await getRepository(Provider).findOne(req.body.provider)
  await pull(provider)
  res.send({ status: 'ok' })
})

export default app
