import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { basename, extname, join } from 'node:path'
import { unlink } from 'node:fs/promises'
import { pool, toIso } from '../db.js'
import { UPLOAD_DIR } from '../paths.js'

const router = Router()

const TYPES = ['requirement', 'defect']
const STATUSES = ['pending', 'developing', 'verifying', 'passed', 'rework', 'archived']
const PORTS = ['8080', '8318']
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024)

const ITEM_COLS = 'id, type, title, description, status, ports, created_at, updated_at'

/** 端口入参 → 合法子集数组；入参不是数组时返回 null（表示请求里没带） */
function normalizePorts(input) {
  if (!Array.isArray(input)) return null
  return PORTS.filter((p) => input.includes(p))
}

/* ---------- 附件上传 ---------- */

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      // 磁盘上用随机名，避免中文文件名与路径穿越问题；原名存数据库
      const ext = extname(file.originalname).slice(0, 12).replace(/[^\w.]/g, '')
      cb(null, `${randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
})

/** multer 按 latin1 解析文件名，中文会乱码，这里还原 */
function decodeName(name) {
  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8')
    return fixed.includes('\uFFFD') ? name : fixed
  } catch {
    return name
  }
}

function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: `文件超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 上限`,
      })
    }
    next(err)
  })
}

/* ---------- 组装返回结构（与前端 types.ts 对齐） ---------- */

async function hydrate(rows) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const [attRows] = await pool.query(
    'SELECT id, item_id, name, size, mime, url, uploaded_at FROM attachments WHERE item_id IN (?) ORDER BY uploaded_at ASC',
    [ids],
  )
  const [cmtRows] = await pool.query(
    'SELECT id, item_id, author, role, body, created_at FROM comments WHERE item_id IN (?) ORDER BY created_at ASC',
    [ids],
  )

  const attMap = new Map()
  for (const a of attRows) {
    if (!attMap.has(a.item_id)) attMap.set(a.item_id, [])
    attMap.get(a.item_id).push({
      id: a.id,
      name: a.name,
      size: a.size,
      mime: a.mime,
      url: a.url,
      uploadedAt: toIso(a.uploaded_at),
    })
  }

  const cmtMap = new Map()
  for (const c of cmtRows) {
    if (!cmtMap.has(c.item_id)) cmtMap.set(c.item_id, [])
    cmtMap.get(c.item_id).push({
      id: c.id,
      author: c.author,
      role: c.role,
      body: c.body,
      createdAt: toIso(c.created_at),
    })
  }

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description ?? '',
    status: r.status,
    ports: String(r.ports ?? '')
      .split(',')
      .filter(Boolean),
    attachments: attMap.get(r.id) ?? [],
    comments: cmtMap.get(r.id) ?? [],
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  }))
}

async function loadOne(id) {
  const [rows] = await pool.query(`SELECT ${ITEM_COLS} FROM items WHERE id = ?`, [id])
  if (rows.length === 0) return null
  return (await hydrate(rows))[0]
}

/* ---------- 列表 ---------- */

router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query
    const params = []
    let sql = `SELECT ${ITEM_COLS} FROM items`
    if (TYPES.includes(type)) {
      sql += ' WHERE type = ?'
      params.push(type)
    }
    sql += ' ORDER BY created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(await hydrate(rows))
  } catch (err) {
    next(err)
  }
})

/* ---------- 创建 ---------- */

router.post('/', async (req, res, next) => {
  try {
    const { type = 'requirement', title, description = '', status = 'pending', ports } = req.body ?? {}

    if (!TYPES.includes(type)) return res.status(400).json({ message: '类型不合法' })
    if (!title || !String(title).trim()) return res.status(400).json({ message: '标题不能为空' })
    if (!STATUSES.includes(status)) return res.status(400).json({ message: '状态不合法' })
    if (ports !== undefined && !Array.isArray(ports)) {
      return res.status(400).json({ message: '适用端口不合法' })
    }
    const portList = normalizePorts(ports) ?? []

    const now = new Date()
    const id = randomUUID()

    await pool.query(
      'INSERT INTO items (id, type, title, description, status, ports, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        type,
        String(title).trim().slice(0, 200),
        String(description),
        status,
        portList.join(','),
        now,
        now,
      ],
    )

    res.status(201).json(await loadOne(id))
  } catch (err) {
    next(err)
  }
})

/* ---------- 更新 ---------- */

router.patch('/:id', async (req, res, next) => {
  try {
    const { title, description, status, type, ports } = req.body ?? {}
    const sets = []
    const params = []

    if (title !== undefined) {
      const t = String(title).trim()
      if (!t) return res.status(400).json({ message: '标题不能为空' })
      sets.push('title = ?')
      params.push(t.slice(0, 200))
    }
    if (description !== undefined) {
      sets.push('description = ?')
      params.push(String(description))
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: '状态不合法' })
      sets.push('status = ?')
      params.push(status)
    }
    if (type !== undefined) {
      if (!TYPES.includes(type)) return res.status(400).json({ message: '类型不合法' })
      sets.push('type = ?')
      params.push(type)
    }
    if (ports !== undefined) {
      if (!Array.isArray(ports)) return res.status(400).json({ message: '适用端口不合法' })
      sets.push('ports = ?')
      params.push((normalizePorts(ports) ?? []).join(','))
    }

    if (sets.length === 0) return res.status(400).json({ message: '没有需要更新的字段' })

    sets.push('updated_at = ?')
    params.push(new Date())
    params.push(req.params.id)

    const [result] = await pool.query(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, params)
    if (result.affectedRows === 0) return res.status(404).json({ message: '条目不存在' })

    res.json(await loadOne(req.params.id))
  } catch (err) {
    next(err)
  }
})

/* ---------- 删除（连带清理磁盘附件） ---------- */

router.delete('/:id', async (req, res, next) => {
  try {
    const [atts] = await pool.query('SELECT url FROM attachments WHERE item_id = ?', [req.params.id])
    const [result] = await pool.query('DELETE FROM items WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: '条目不存在' })

    await Promise.all(
      atts.map((a) => unlink(join(UPLOAD_DIR, basename(a.url))).catch(() => undefined)),
    )

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/* ---------- 评论 ---------- */

router.post('/:id/comments', async (req, res, next) => {
  try {
    const { author, role, body } = req.body ?? {}
    if (!body || !String(body).trim()) return res.status(400).json({ message: '内容不能为空' })

    const [exists] = await pool.query('SELECT id FROM items WHERE id = ?', [req.params.id])
    if (exists.length === 0) return res.status(404).json({ message: '条目不存在' })

    const id = randomUUID()
    const now = new Date()
    await pool.query(
      'INSERT INTO comments (id, item_id, author, role, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        req.params.id,
        String(author || '匿名').slice(0, 50),
        // 兼容早期版本写入的 teacher / student
        role === 'developer' || role === 'student' ? 'developer' : 'product',
        String(body),
        now,
      ],
    )
    await pool.query('UPDATE items SET updated_at = ? WHERE id = ?', [now, req.params.id])

    res.status(201).json(await loadOne(req.params.id))
  } catch (err) {
    next(err)
  }
})

/* ---------- 附件 ---------- */

router.post('/:id/attachments', uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: '没有收到文件' })

    const [exists] = await pool.query('SELECT id FROM items WHERE id = ?', [req.params.id])
    if (exists.length === 0) {
      await unlink(req.file.path).catch(() => undefined)
      return res.status(404).json({ message: '条目不存在' })
    }

    const id = randomUUID()
    await pool.query(
      'INSERT INTO attachments (id, item_id, name, size, mime, url, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        req.params.id,
        decodeName(req.file.originalname).slice(0, 255),
        req.file.size,
        (req.file.mimetype || 'application/octet-stream').slice(0, 120),
        `/uploads/${req.file.filename}`,
        new Date(),
      ],
    )

    res.status(201).json(await loadOne(req.params.id))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id/attachments/:attId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT url FROM attachments WHERE id = ? AND item_id = ?',
      [req.params.attId, req.params.id],
    )
    if (rows.length === 0) return res.status(404).json({ message: '附件不存在' })

    await pool.query('DELETE FROM attachments WHERE id = ?', [req.params.attId])
    await unlink(join(UPLOAD_DIR, basename(rows[0].url))).catch(() => undefined)

    res.json(await loadOne(req.params.id))
  } catch (err) {
    next(err)
  }
})

export default router
