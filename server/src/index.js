import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import itemsRouter from './routes/items.js'
import { pool } from './db.js'
import { UPLOAD_DIR, WEB_DIR } from './paths.js'

mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()

/**
 * 同源部署（前端构建产物由本服务托管）时浏览器不会发起跨域请求，
 * 因此只有显式配置 CORS_ORIGIN 才放行对应来源，默认不允许跨域。
 */
const origins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: origins.length > 0 ? origins : false }))
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

/** 前端构建产物。缺失时服务仍可启动，只是不提供页面（便于先跑通接口）。 */
const webIndex = join(WEB_DIR, 'index.html')
const hasWeb = existsSync(webIndex)

if (hasWeb) {
  app.use(express.static(WEB_DIR, { maxAge: '1h', index: false }))
}

app.use((req, res) => {
  // 接口路径仍返回 JSON 错误；其余 GET 回落到前端入口
  const isApi = req.path.startsWith('/api/') || req.path.startsWith('/uploads/')
  if (hasWeb && req.method === 'GET' && !isApi) {
    res.sendFile(webIndex)
    return
  }
  res.status(404).json({ message: '接口不存在' })
})

app.use((err, _req, res, _next) => {
  console.error('[error]', err.message)
  res.status(err.status || 500).json({ message: err.message || '服务器内部错误' })
})

const port = Number(process.env.PORT || 8218)

app.listen(port, () => {
  console.log(`需求协作板后端已启动，监听 0.0.0.0:${port}`)
  console.log(`健康检查：http://127.0.0.1:${port}/api/health`)
  console.log(
    hasWeb
      ? `前端页面：http://127.0.0.1:${port}/`
      : `未找到前端构建产物（${WEB_DIR}），当前仅提供接口`,
  )
})
