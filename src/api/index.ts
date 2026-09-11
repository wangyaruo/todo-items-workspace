import type { Comment, Item, ItemDraft, Role } from '@/types'
import { uid } from '@/utils/format'

/**
 * 数据访问层。
 *
 * 当前实现为浏览器本地存储（localStorage），用于本地开发与演示。
 * 后续接入你自己的服务器时，只需再实现一个 BoardApi（例如 httpApi），
 * 把下面导出的 `api` 换成它即可，组件层无需改动。
 *
 *   export const api: BoardApi = httpApi
 */
export interface BoardApi {
  list(): Promise<Item[]>
  create(draft: ItemDraft): Promise<Item>
  update(id: string, patch: ItemPatch): Promise<Item>
  remove(id: string): Promise<void>
  addComment(id: string, payload: NewComment): Promise<Comment>
  reset(): Promise<void>
}

export type ItemPatch = Partial<
  Pick<Item, 'type' | 'title' | 'description' | 'status' | 'attachments'>
>

export interface NewComment {
  author: string
  role: Role
  body: string
}

const STORAGE_KEY = 'todo-board:items:v1'

function readAll(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Item[]) : []
  } catch {
    return []
  }
}

function writeAll(items: Item[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    const e = err as { name?: string }
    if (e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      throw new Error('浏览器本地存储已满，请删除部分附件或条目后重试。')
    }
    throw err
  }
}

function toItem(draft: ItemDraft): Item {
  const now = new Date().toISOString()
  return {
    id: uid('item'),
    type: draft.type,
    title: draft.title,
    description: draft.description,
    status: draft.status,
    attachments: draft.attachments,
    comments: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const api: BoardApi = {
  async list() {
    return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async create(draft) {
    const item = toItem(draft)
    const all = readAll()
    all.unshift(item)
    writeAll(all)
    return item
  },

  async update(id, patch) {
    const all = readAll()
    const idx = all.findIndex((it) => it.id === id)
    if (idx < 0) throw new Error('条目不存在或已被删除。')
    const next: Item = { ...all[idx], ...patch, updatedAt: new Date().toISOString() }
    all[idx] = next
    writeAll(all)
    return next
  },

  async remove(id) {
    writeAll(readAll().filter((it) => it.id !== id))
  },

  async addComment(id, payload) {
    const all = readAll()
    const idx = all.findIndex((it) => it.id === id)
    if (idx < 0) throw new Error('条目不存在或已被删除。')
    const comment: Comment = {
      id: uid('cmt'),
      author: payload.author,
      role: payload.role,
      body: payload.body,
      createdAt: new Date().toISOString(),
    }
    all[idx] = {
      ...all[idx],
      comments: [...all[idx].comments, comment],
      updatedAt: comment.createdAt,
    }
    writeAll(all)
    return comment
  },

  async reset() {
    writeAll([])
  },
}
