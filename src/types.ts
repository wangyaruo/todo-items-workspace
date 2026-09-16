/** 条目类型：需求 / 缺陷 */
export type ItemType = 'requirement' | 'defect'

/** 适用端口的合法取值 */
export type PortKey = '8080' | '8318'

/** 状态标签流转 */
export type StatusKey =
  | 'pending' // 待处理
  | 'developing' // 开发中
  | 'verifying' // 待验证
  | 'passed' // 验证通过
  | 'rework' // 重新处理
  | 'archived' // 已归档（移入左侧对应已归档清单，可从主列表改回）

/** 附件。本地模式为内联 base64；接入后端后为 /uploads/xxx 访问路径 */
export interface Attachment {
  id: string
  name: string
  size: number
  mime: string
  url: string
  uploadedAt: string
}

/** 评论（开发填写完成情况） */
export interface Comment {
  id: string
  author: string
  role: 'product' | 'developer'
  body: string
  createdAt: string
}

/** 一条需求 / 缺陷 */
export interface Item {
  id: string
  type: ItemType
  title: string
  description: string
  status: StatusKey
  /** 适用端口，取值 '8080' / '8318'，可多选；空数组表示未指定 */
  ports: PortKey[]
  /** 已完成（上线/开发完成）的端口，必为 ports 的子集；用于多端口分别完成的进度提示 */
  donePorts: PortKey[]
  attachments: Attachment[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

/** 新建时提交的字段（附件在条目创建后单独上传） */
export interface ItemDraft {
  type: ItemType
  title: string
  description: string
  status: StatusKey
  ports: PortKey[]
}

/** 当前操作人身份（仅用于署名与默认视角，不做权限隔离） */
export type Role = 'product' | 'developer'

/** 状态筛选下拉的一个选项（'all' 表示不筛选） */
export interface FilterOption {
  key: StatusKey | 'all'
  label: string
  count: number
  color: string
}
