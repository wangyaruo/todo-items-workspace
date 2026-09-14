import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DB_NAME, serverOptions } from './db.js'
import { here } from './paths.js'

const conn = await mysql.createConnection({
  ...serverOptions,
  multipleStatements: true,
})

try {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await conn.query(`USE \`${DB_NAME}\``)

  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  await conn.query(sql)

  const [tables] = await conn.query('SHOW TABLES')
  const names = tables.map((row) => Object.values(row)[0])
  console.log(`数据库已就绪：${DB_NAME}`)
  console.log(`表：${names.join(', ') || '(空)'}`)
} catch (err) {
  console.error('初始化失败：', err.message)
  console.error('请检查 server/.env 里的数据库连接配置，以及 MySQL 服务是否已启动。')
  process.exitCode = 1
} finally {
  await conn.end()
}
