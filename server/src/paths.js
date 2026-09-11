import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const here = dirname(fileURLToPath(import.meta.url))

/** 附件落盘目录：server/uploads/ */
export const UPLOAD_DIR = join(here, '..', 'uploads')
