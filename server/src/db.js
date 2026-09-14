import 'dotenv/config'
import mysql from 'mysql2/promise'

/**
 * 连接参数（不含库名）。
 * 建库脚本需要在库还不存在时先连上 MySQL，所以这部分单独提供，
 * init-db / check-db 直接复用，避免三处各写一遍。
 */
export const serverOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4_unicode_ci',
}

export const DB_NAME = process.env.DB_NAME || 'todo_items'

export const pool = mysql.createPool({
  ...serverOptions,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
})

/** Date -> ISO 字符串，前端统一按 ISO 处理时间 */
export function toIso(value) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
