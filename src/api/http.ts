import type { Item } from '@/types'
import type { BoardApi, CommentIdentity, ItemPatch, NewComment } from './types'

/**
 * 自有服务器实现。
 * 默认走相对路径（开发时由 Vite 代理到后端，生产时前后端同源部署）。
 * 若前后端不同源，在 .env 里设置 VITE_API_BASE=https://你的域名
 */
const BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new Error('连不上后端服务，请确认它已启动、地址配置正确。')
  }

  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`
    try {
      const data = (await res.json()) as { message?: string }
      if (data?.message) message = data.message
    } catch {
      // 响应不是 JSON，保留默认文案
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function jsonBody(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

const itemUrl = (id: string) => `/api/items/${encodeURIComponent(id)}`

export const httpApi: BoardApi = {
  list: () => request<Item[]>('/api/items'),

  create: (draft) => request<Item>('/api/items', { method: 'POST', ...jsonBody(draft) }),

  update: (id, patch: ItemPatch) => request<Item>(itemUrl(id), { method: 'PATCH', ...jsonBody(patch) }),

  remove: (id) => request<void>(itemUrl(id), { method: 'DELETE' }),

  addComment: (id, payload: NewComment) =>
    request<Item>(`${itemUrl(id)}/comments`, { method: 'POST', ...jsonBody(payload) }),

  deleteComment: (id, commentId, identity: CommentIdentity) =>
    request<Item>(`${itemUrl(id)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      ...jsonBody(identity),
    }),

  uploadAttachment: (id, file) => {
    const form = new FormData()
    // 不要手动设置 Content-Type，浏览器需要自己补 multipart 边界
    form.append('file', file)
    return request<Item>(`${itemUrl(id)}/attachments`, { method: 'POST', body: form })
  },

  removeAttachment: (id, attachmentId) =>
    request<Item>(`${itemUrl(id)}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: 'DELETE',
    }),
}
