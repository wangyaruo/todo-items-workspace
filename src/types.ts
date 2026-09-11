/** 条目类型：需求 / 缺陷 */
export type ItemType = 'requirement' | 'defect'

/** 状态标签流转 */
export type StatusKey =
  | 'pending' // 待处理
  | 'developing' // 开发中
  | 'verifying' // 待验证
  | 'passed' // 验证通过
  | 'rework' // 重新处理

/** 附件。本地模式为内联 base64；接入后端后为 /uploads/xxx 访问路径 */
export interface Attachment {
  id: string
  name: string
  size: number
  mime: string
  url: string
  uploadedAt: string
}

/** 评论（学生填写完成情况） */
export interface Comment {
  id: string
  author: string
  role: 'teacher' | 'student'
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
}

/** 当前操作人身份（仅用于署名与默认视角，不做权限隔离） */
export type Role = 'teacher' | 'student'
