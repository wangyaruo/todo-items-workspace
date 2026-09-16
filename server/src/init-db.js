import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DB_NAME, serverOptions } from './db.js'
import { here } from './paths.js'

/**
 * 优先直接连目标库：库已存在时就不需要 CREATE DATABASE 权限，
 * 专用账号（只有目标库权限）也能完成建表。
 * 连不上（库不存在 / 没权限）再退回建库流程，此时需要较高权限。
 */
async function connect() {
  try {
    return await mysql.createConnection({
      ...serverOptions,
      database: DB_NAME,
      multipleStatements: true,
    })
  } catch {
    const conn = await mysql.createConnection({ ...serverOptions, multipleStatements: true })
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await conn.query(`USE \`${DB_NAME}\``)
    return conn
  }
}

const conn = await connect()

try {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  await conn.query(sql)

  // 迁移：给旧库补 ports / done_ports 列（CREATE TABLE IF NOT EXISTS 不会更新已存在的表）
  const [cols] = await conn.query("SHOW COLUMNS FROM items LIKE 'ports'")
  if (cols.length === 0) {
    await conn.query(
      "ALTER TABLE items ADD COLUMN ports VARCHAR(32) NOT NULL DEFAULT '' COMMENT '适用端口，逗号分隔：8080 / 8318' AFTER status",
    )
    console.log('已为 items 表新增 ports 列')
  }

  const [doneCols] = await conn.query("SHOW COLUMNS FROM items LIKE 'done_ports'")
  if (doneCols.length === 0) {
    await conn.query(
      "ALTER TABLE items ADD COLUMN done_ports VARCHAR(32) NOT NULL DEFAULT '' COMMENT '已完成端口，逗号分隔，须为 ports 的子集' AFTER ports",
    )
    console.log('已为 items 表新增 done_ports 列')
  }

  // 迁移：给旧库补 comments 软删除列（删除留痕：记录删除人与时间，内容不再展示）
  const [cmtDelCols] = await conn.query("SHOW COLUMNS FROM comments LIKE 'deleted_at'")
  if (cmtDelCols.length === 0) {
    await conn.query(
      "ALTER TABLE comments ADD COLUMN deleted_at DATETIME(3) NULL COMMENT '软删除时间，非空即已删除（留痕，不展示内容）' AFTER created_at",
    )
    await conn.query(
      "ALTER TABLE comments ADD COLUMN deleted_by VARCHAR(50) NULL COMMENT '删除人署名' AFTER deleted_at",
    )
    await conn.query(
      "ALTER TABLE comments ADD COLUMN deleted_by_role VARCHAR(16) NULL COMMENT '删除人角色 product / developer' AFTER deleted_by",
    )
    console.log('已为 comments 表新增 deleted_at / deleted_by / deleted_by_role 列')
  }

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
