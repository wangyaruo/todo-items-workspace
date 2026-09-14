import type { Item, ItemDraft, ItemType, Role, StatusKey } from '@/types'

/** 可局部更新的字段 */
export interface ItemPatch {
  type?: ItemType
  title?: string
  description?: string
  status?: StatusKey
}

export interface NewComment {
  author: string
  role: Role
  body: string
}

/**
 * 数据访问层契约。
 * 有两套实现：local（浏览器本地存储）与 http（自有服务器接口）。
 * 新增数据源时实现本接口即可，组件层无需改动。
 */
export interface BoardApi {
  list(): Promise<Item[]>
  create(draft: ItemDraft): Promise<Item>
  update(id: string, patch: ItemPatch): Promise<Item>
  remove(id: string): Promise<void>
  addComment(id: string, payload: NewComment): Promise<Item>
  uploadAttachment(id: string, file: File): Promise<Item>
  removeAttachment(id: string, attachmentId: string): Promise<Item>
}
