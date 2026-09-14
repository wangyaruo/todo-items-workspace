import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_ITEM } from '@/constants'
import { formatSize } from './format'

export interface AcceptResult {
  /** 通过校验、可以上传的文件 */
  accepted: File[]
  /** 第一条不合规的说明；全部合规时为空串 */
  error: string
}

/**
 * 附件上传前的本地校验。
 *
 * 三处入口（描述框粘贴截图、附件区选择文件、新建面板粘贴截图）规则与文案完全一致，
 * 集中在这里，避免三份逐字重复的实现各自漂移。
 *
 * @param files         本次待校验的文件
 * @param existingCount 该条目当前已有附件数
 */
export function acceptFiles(files: File[], existingCount: number): AcceptResult {
  const room = MAX_ATTACHMENTS_PER_ITEM - existingCount
  const accepted: File[] = []
  let error = ''

  for (const file of files) {
    // 数量满了就停止，后面的文件不再逐个报错
    if (accepted.length >= room) {
      error = `每条最多 ${MAX_ATTACHMENTS_PER_ITEM} 个附件。`
      break
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      error = `「${file.name}」${formatSize(file.size)}，超过单文件 ${formatSize(MAX_ATTACHMENT_BYTES)} 上限。`
      continue
    }
    accepted.push(file)
  }

  return { accepted, error }
}
