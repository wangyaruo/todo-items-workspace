/** 条目类型：需求 / 缺陷 */
export type ItemType = 'requirement' | 'defect'

/** 状态标签流转 */
export type StatusKey =
  | 'pending' // 待处理
  | 'developing' // 开发中
  | 'verifying' // 待验证
  | 'passed' // 验证通过
  | 'rework' // 重新处理

/** 附件。dataUrl 为本地版内联存储；接入自己的服务器后换成远端 URL 即可 */
export interface Attachment {
  id: string
  name: string
  size: number
  mime: string
  dataUrl: string
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

/** 新建时提交的字段 */
export interface ItemDraft {
  type: ItemType
  title: string
  description: string
  status: StatusKey
  attachments: Attachment[]
}

/** 当前操作人身份（仅用于署名与默认视角，不做权限隔离） */
export type Role = 'teacher' | 'student'
