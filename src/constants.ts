import type { ItemType, Role, StatusKey } from './types'

export interface TypeMeta {
  key: ItemType
  label: string
  desc: string
}

export const ITEM_TYPES: TypeMeta[] = [
  { key: 'requirement', label: '需求', desc: '需要实现的功能' },
  { key: 'defect', label: '缺陷', desc: '需要修复的问题' },
]

export function typeMeta(key: ItemType): TypeMeta {
  return ITEM_TYPES.find((t) => t.key === key) ?? ITEM_TYPES[0]
}

export interface StatusMeta {
  key: StatusKey
  label: string
  /** 主色 */
  color: string
  /** 浅底色 */
  bg: string
  /** 边框色 */
  border: string
  /** 给学生的操作提示 */
  hint: string
}

export const STATUS_FLOW: StatusMeta[] = [
  {
    key: 'pending',
    label: '待处理',
    color: '#5b6b7f',
    bg: '#f1f5f9',
    border: '#dbe3ec',
    hint: '需求已下达，等待学生开始',
  },
  {
    key: 'developing',
    label: '开发中',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#cfe0fb',
    hint: '学生正在动手完成',
  },
  {
    key: 'verifying',
    label: '待验证',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fbe4b8',
    hint: '学生已完成，等待老师验收',
  },
  {
    key: 'passed',
    label: '验证通过',
    color: '#047857',
    bg: '#ecfdf5',
    border: '#bbe7d4',
    hint: '老师验收通过，此条归档',
  },
  {
    key: 'rework',
    label: '重新处理',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#f7c9c9',
    hint: '验收未通过，需要返工',
  },
]

export function statusMeta(key: StatusKey): StatusMeta {
  return STATUS_FLOW.find((s) => s.key === key) ?? STATUS_FLOW[0]
}

export const ROLE_LABEL: Record<Role, string> = {
  teacher: '老师',
  student: '学生',
}

/** 单文件大小上限（与后端 MAX_UPLOAD_BYTES 保持一致） */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** 单个条目的附件数量上限 */
export const MAX_ATTACHMENTS_PER_ITEM = 10
