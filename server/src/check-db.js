import mysql from 'mysql2/promise'
import { DB_NAME, serverOptions } from './db.js'

try {
  const conn = await mysql.createConnection({ ...serverOptions, database: DB_NAME })

  const [[ver]] = await conn.query('SELECT VERSION() AS v')
  const [tables] = await conn.query('SHOW TABLES')

  console.log(`连接成功，MySQL 版本：${ver.v}`)
  console.log(`数据库：${DB_NAME}`)
  console.log(
    `表：${tables.map((r) => Object.values(r)[0]).join(', ') || '(还没有表，先执行 npm run init-db)'}`,
  )

  await conn.end()
} catch (err) {
  console.error('连接失败：', err.message)
  process.exitCode = 1
}
