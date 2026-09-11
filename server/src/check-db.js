import 'dotenv/config'
import mysql from 'mysql2/promise'

const DB_NAME = process.env.DB_NAME || 'todo_items'

try {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
  })

  const [[ver]] = await conn.query('SELECT VERSION() AS v')
  const [tables] = await conn.query('SHOW TABLES')

  console.log(`连接成功，MySQL 版本：${ver.v}`)
  console.log(`数据库：${DB_NAME}`)
  console.log(`表：${tables.map((r) => Object.values(r)[0]).join(', ') || '(还没有表，先执行 npm run init-db)'}`)

  await conn.end()
} catch (err) {
  console.error('连接失败：', err.message)
  process.exitCode = 1
}
