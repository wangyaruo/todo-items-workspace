import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const here = dirname(fileURLToPath(import.meta.url))

/** 附件落盘目录：server/uploads/ */
export const UPLOAD_DIR = join(here, '..', 'uploads')

/** 前端构建产物目录：仓库根 dist/（由 `npm run build` 生成） */
export const WEB_DIR = process.env.WEB_DIR || join(here, '..', '..', 'dist')
