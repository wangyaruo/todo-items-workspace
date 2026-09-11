import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { mkdirSync } from 'node:fs'
import itemsRouter from './routes/items.js'
import { pool } from './db.js'
import { UPLOAD_DIR } from './paths.js'

mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()

const origins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: origins.length > 0 ? origins : true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: 'up' })
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', message: err.message })
  }
})

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }))
app.use('/api/items', itemsRouter)

app.use((_req, res) => {
  res.status(404).json({ message: '接口不存在' })
})

app.use((err, _req, res, _next) => {
  console.error('[error]', err.message)
  res.status(err.status || 500).json({ message: err.message || '服务器内部错误' })
})

const port = Number(process.env.PORT || 3000)

app.listen(port, () => {
  console.log(`需求协作板后端已启动：http://127.0.0.1:${port}`)
  console.log(`健康检查：http://127.0.0.1:${port}/api/health`)
})
