import type { ItemType, PortKey, Role, StatusKey } from './types'

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
  /** 给开发的操作提示 */
  hint: string
}

export const STATUS_FLOW: StatusMeta[] = [
  {
    key: 'pending',
    label: '待处理',
    color: '#5b6b7f',
    bg: '#f1f5f9',
    border: '#dbe3ec',
    hint: '需求已下达，等待开发开始',
  },
  {
    key: 'developing',
    label: '开发中',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#cfe0fb',
    hint: '开发正在动手完成',
  },
  {
    key: 'verifying',
    label: '待验证',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fbe4b8',
    hint: '开发已完成，等待产品验收',
  },
  {
    key: 'passed',
    label: '验证通过',
    color: '#047857',
    bg: '#ecfdf5',
    border: '#bbe7d4',
    hint: '产品验收通过，此条归档',
  },
  {
    key: 'rework',
    label: '重新处理',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#f7c9c9',
    hint: '验收未通过，需要返工',
  },
  {
    key: 'archived',
    label: '已归档',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#d8e0ea',
    hint: '已归档，在左侧对应已归档清单里展示',
  },
]

export function statusMeta(key: StatusKey): StatusMeta {
  return STATUS_FLOW.find((s) => s.key === key) ?? STATUS_FLOW[0]
}

/**
 * 列表排序的状态权重（与 STATUS_FLOW 的展示顺序无关，别复用）：
 * 待处理、重新处理优先露脸，然后是开发中、待验证、验证通过，已归档垫底。
 */
export const STATUS_SORT_ORDER: Record<StatusKey, number> = {
  pending: 0,
  rework: 1,
  developing: 2,
  verifying: 3,
  passed: 4,
  archived: 5,
}

export const ROLE_LABEL: Record<Role, string> = {
  product: '产品',
  developer: '开发',
}

/** 适用端口的展示元信息 */
export interface PortMeta {
  key: PortKey
  label: string
  /** 主色 */
  color: string
  /** 浅底色 */
  bg: string
  /** 边框色 */
  border: string
}

export const PORT_OPTIONS: PortMeta[] = [
  { key: '8080', label: '8080', color: '#1d4ed8', bg: '#eff6ff', border: '#c7d9fb' },
  { key: '8318', label: '8318', color: '#0f766e', bg: '#f0fdfa', border: '#c2e9e2' },
]

/** 「全部」按钮（= 两个端口都选）的配色 */
export const ALL_PORTS_META = {
  key: 'all',
  label: '全部',
  color: '#b45309',
  bg: '#fffbeb',
  border: '#fbe4b8',
}

export function portMeta(key: string): PortMeta | undefined {
  return PORT_OPTIONS.find((p) => p.key === key)
}

/** 单文件大小上限（与后端 MAX_UPLOAD_BYTES 保持一致） */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** 单个条目的附件数量上限 */
export const MAX_ATTACHMENTS_PER_ITEM = 10
