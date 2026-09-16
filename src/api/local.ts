import type { Attachment, Item, ItemDraft, PortKey } from '@/types'
import { uid } from '@/utils/format'
import { applyVerifyingRule } from '@/utils/ports'
import type { BoardApi, CommentIdentity, NewComment } from './types'

/**
 * 浏览器本地存储实现。
 * 数据只存在当前浏览器里，换设备或换浏览器都看不到，两人之间也不互通。
 * 适合离线演示；要多人共享请使用 http 实现。
 */
const STORAGE_KEY = 'todo-board:items:v1'

function readAll(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 兼容旧数据：没有 ports / donePorts 字段的条目补空数组
    return (parsed as Item[]).map((it) => ({
      ...it,
      ports: (it.ports ?? []) as PortKey[],
      donePorts: (it.donePorts ?? []) as PortKey[],
    }))
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
      throw new Error('浏览器本地存储已满。附件会以 base64 内联保存，容量很小，建议改用后端模式。')
    }
    throw err
  }
}

function indexOf(all: Item[], id: string): number {
  const idx = all.findIndex((it) => it.id === id)
  if (idx < 0) throw new Error('条目不存在或已被删除。')
  return idx
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

export const localApi: BoardApi = {
  async list() {
    return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async create(draft: ItemDraft) {
    if (draft.status === 'verifying') {
      throw new Error('新建时不能设为「待验证」：至少需一个端口已完成。')
    }
    const now = new Date().toISOString()
    const item: Item = {
      id: uid('item'),
      type: draft.type,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      ports: [...draft.ports],
      donePorts: [],
      attachments: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    }
    const all = readAll()
    all.unshift(item)
    writeAll(all)
    return item
  },

  async update(id, patch) {
    const all = readAll()
    const idx = indexOf(all, id)
    const next: Item = { ...all[idx], ...patch, updatedAt: new Date().toISOString() }
    // 「待验证」规则：至少一个端口已完成；取消最后一个完成标记时自动退回开发中
    const rule = applyVerifyingRule(all[idx], {
      status: patch.status,
      ports: patch.ports,
      donePorts: patch.donePorts,
    })
    if (rule.error) throw new Error(rule.error)
    next.status = rule.status
    next.donePorts = rule.donePorts
    all[idx] = next
    writeAll(all)
    return next
  },

  async remove(id) {
    writeAll(readAll().filter((it) => it.id !== id))
  },

  async addComment(id, payload: NewComment) {
    const all = readAll()
    const idx = indexOf(all, id)
    const now = new Date().toISOString()
    const next: Item = {
      ...all[idx],
      comments: [
        ...all[idx].comments,
        {
          id: uid('cmt'),
          author: payload.author,
          role: payload.role,
          body: payload.body,
          createdAt: now,
        },
      ],
      updatedAt: now,
    }
    all[idx] = next
    writeAll(all)
    return next
  },

  async deleteComment(id, commentId, identity: CommentIdentity) {
    const all = readAll()
    const idx = indexOf(all, id)
    const comments = [...all[idx].comments]
    const cIdx = comments.findIndex((c) => c.id === commentId)
    if (cIdx < 0) throw new Error('评论不存在或已被删除。')
    const target = comments[cIdx]
    if (target.deleted) throw new Error('评论已被删除。')
    // 只能删自己发的：署名与角色都需匹配
    if (target.author !== identity.author || target.role !== identity.role) {
      throw new Error('只能删除自己发布的评论。')
    }
    comments[cIdx] = {
      ...target,
      deleted: true,
      deletedBy: identity.author,
      deletedByRole: identity.role,
      deletedAt: new Date().toISOString(),
    }
    const next: Item = { ...all[idx], comments, updatedAt: new Date().toISOString() }
    all[idx] = next
    writeAll(all)
    return next
  },

  async uploadAttachment(id, file) {
    const all = readAll()
    const idx = indexOf(all, id)
    const att: Attachment = {
      id: uid('att'),
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      url: await readAsDataURL(file),
      uploadedAt: new Date().toISOString(),
    }
    const next: Item = {
      ...all[idx],
      attachments: [...all[idx].attachments, att],
      updatedAt: att.uploadedAt,
    }
    all[idx] = next
    writeAll(all)
    return next
  },

  async removeAttachment(id, attachmentId) {
    const all = readAll()
    const idx = indexOf(all, id)
    const next: Item = {
      ...all[idx],
      attachments: all[idx].attachments.filter((a) => a.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    }
    all[idx] = next
    writeAll(all)
    return next
  },
}
