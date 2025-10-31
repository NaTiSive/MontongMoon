import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/', routes)

export default app
