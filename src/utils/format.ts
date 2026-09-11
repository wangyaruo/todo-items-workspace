/** 2026-09-11 17:39 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 3 分钟前 / 2 小时前 / 昨天 / 具体日期 */
export function relativeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day} 天前`
  return formatDateTime(iso).slice(0, 10)
}

/** 1.2 MB / 340 KB */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 取扩展名，用于附件图标 */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > -1 ? name.slice(i + 1).toUpperCase() : 'FILE'
}

let seq = 0
/** 稳定唯一 id */
export function uid(prefix = 'id'): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  if (g.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`
  seq += 1
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`
}
