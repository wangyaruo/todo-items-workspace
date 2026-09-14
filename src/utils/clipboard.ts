/**
 * 剪贴板取图。
 *
 * 用于描述输入框的粘贴截图能力。判定规则：
 * - 剪贴板里同时存在非空文字时，视为「用户想粘文字」，不拦截，交回浏览器默认行为；
 * - 只存在图片时（macOS 截图 ⌘⇧⌃4 即属此类），取出来当成图片文件交给上传通道。
 */

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

/** 系统剪贴板给的默认文件名，没有信息量，识别出来后按时间重命名 */
const GENERIC_NAME = /^(image|photo|untitled|blob|clipboard)([-_. ]?\d+)?\.(png|jpe?g|gif|bmp|tiff?|webp)$/i

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 统一命名成「截图-20260914-093627.png」，多张时追加序号 */
function renameAsShot(blob: Blob, index: number, total: number): File {
  const mime = blob.type || 'image/png'
  const ext = EXT_BY_MIME[mime] ?? 'png'
  const raw = (blob as File).name ?? ''
  const keepName = raw && !GENERIC_NAME.test(raw)
  const base = keepName ? raw.replace(/\.[^.]+$/, '') : `截图-${stamp()}`
  const suffix = total > 1 ? `-${index + 1}` : ''
  return new File([blob], `${base}${suffix}.${ext}`, { type: mime, lastModified: Date.now() })
}

/**
 * 从粘贴事件中提取图片文件。
 * 返回空数组表示「不是粘贴图片」，调用方应放行浏览器默认粘贴。
 */
export function imageFilesFromClipboard(event: ClipboardEvent): File[] {
  const dt = event.clipboardData
  if (!dt) return []

  let text = ''
  try {
    text = (dt.getData?.('text/plain') ?? '').trim()
  } catch {
    // 某些环境取文本会抛错，按「无文本」处理
  }
  if (text) return []

  const blobs: Blob[] = []
  const items = dt.items ? Array.from(dt.items) : []
  for (const item of items) {
    if (item.kind !== 'file') continue
    if (!item.type || !item.type.startsWith('image/')) continue
    const file = item.getAsFile?.()
    if (file) blobs.push(file)
  }

  // 少数环境不提供 items，只给 files
  if (blobs.length === 0 && dt.files) {
    for (const file of Array.from(dt.files)) {
      if (file.type?.startsWith('image/')) blobs.push(file)
    }
  }

  return blobs.map((blob, i) => renameAsShot(blob, i, blobs.length))
}

/** 是否为图片附件 */
export function isImageMime(mime: string): boolean {
  return !!mime && mime.startsWith('image/')
}
