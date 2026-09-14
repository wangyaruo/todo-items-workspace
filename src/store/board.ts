import { computed, ref } from 'vue'
import { api, type ItemPatch } from '@/api'
import type { Item, ItemDraft, ItemType, Role, StatusKey } from '@/types'

/** 全局状态（模块级单例，组件直接引入使用） */
export const items = ref<Item[]>([])
export const loading = ref(false)
export const errorMessage = ref('')
export const activeType = ref<ItemType>('requirement')
export const activeId = ref('')
export const statusFilter = ref<StatusKey | 'all'>('all')
export const currentRole = ref<Role>(readRole())
export const displayName = ref(readName())
/** 新建面板是否展开 */
export const composerOpen = ref(false)

export const productName = ref('产品')
export const developerName = ref('开发')

function readRole(): Role {
  const v = localStorage.getItem('todo-board:role')
  // 兼容早期版本写入的 teacher / student
  if (v === 'developer' || v === 'student') return 'developer'
  return 'product'
}

function readName(): string {
  return localStorage.getItem(`todo-board:name:${readRole()}`) ?? ''
}

/** 当前显示名的兜底：未自定义时按角色给默认称呼 */
export const effectiveName = computed(
  () => displayName.value.trim() || (currentRole.value === 'product' ? productName.value : developerName.value),
)

export function setRole(role: Role): void {
  currentRole.value = role
  localStorage.setItem('todo-board:role', role)
  displayName.value = localStorage.getItem(`todo-board:name:${role}`) ?? ''
}

export function setName(name: string): void {
  displayName.value = name
  localStorage.setItem(`todo-board:name:${currentRole.value}`, name)
}

export function setProductName(name: string): void {
  productName.value = name.trim() || '产品'
  localStorage.setItem('todo-board:productName', productName.value)
}

export function setDeveloperName(name: string): void {
  developerName.value = name.trim() || '开发'
  localStorage.setItem('todo-board:developerName', developerName.value)
}

export function loadNames(): void {
  productName.value = localStorage.getItem('todo-board:productName') || '产品'
  developerName.value = localStorage.getItem('todo-board:developerName') || '开发'
}

/** 当前类型下各状态的数量 */
export const statusCounts = computed<Record<StatusKey | 'all', number>>(() => {
  const base: Record<string, number> = { all: 0 }
  const scoped = items.value.filter((it) => it.type === activeType.value)
  base.all = scoped.length
  for (const it of scoped) base[it.status] = (base[it.status] ?? 0) + 1
  return base as Record<StatusKey | 'all', number>
})

/** 左侧两类各自的待办数量（不含验证通过） */
export const typeCounts = computed<Record<ItemType, { total: number; open: number }>>(() => {
  const mk = () => ({ total: 0, open: 0 })
  const out: Record<ItemType, { total: number; open: number }> = {
    requirement: mk(),
    defect: mk(),
  }
  for (const it of items.value) {
    out[it.type].total += 1
    if (it.status !== 'passed') out[it.type].open += 1
  }
  return out
})

/** 当前展示的列表 */
export const visibleItems = computed(() => {
  const list = items.value.filter((it) => it.type === activeType.value)
  const filtered = statusFilter.value === 'all' ? list : list.filter((it) => it.status === statusFilter.value)
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

export const activeItem = computed(() => items.value.find((it) => it.id === activeId.value) ?? null)

export async function refresh(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    items.value = await api.list()
    if (activeId.value && !items.value.some((it) => it.id === activeId.value)) {
      activeId.value = ''
    }
    if (!activeId.value && visibleItems.value.length > 0) {
      activeId.value = visibleItems.value[0].id
    }
  } catch (err) {
    errorMessage.value = (err as Error).message || '加载失败'
  } finally {
    loading.value = false
  }
}

function replaceItem(next: Item): void {
  const idx = items.value.findIndex((it) => it.id === next.id)
  if (idx > -1) items.value[idx] = next
}

export async function createItem(draft: ItemDraft, files: File[] = []): Promise<Item | null> {
  errorMessage.value = ''
  try {
    const created = await api.create(draft)
    items.value = [created, ...items.value]
    activeType.value = created.type
    statusFilter.value = 'all'
    activeId.value = created.id
    if (files.length > 0) await uploadAttachments(created.id, files)
    return items.value.find((it) => it.id === created.id) ?? created
  } catch (err) {
    errorMessage.value = (err as Error).message || '创建失败'
    return null
  }
}

export async function patchItem(id: string, patch: ItemPatch): Promise<void> {
  errorMessage.value = ''
  try {
    replaceItem(await api.update(id, patch))
  } catch (err) {
    errorMessage.value = (err as Error).message || '更新失败'
  }
}

export async function deleteItem(id: string): Promise<void> {
  errorMessage.value = ''
  try {
    await api.remove(id)
    items.value = items.value.filter((it) => it.id !== id)
    if (activeId.value === id) {
      activeId.value = visibleItems.value[0]?.id ?? ''
    }
  } catch (err) {
    errorMessage.value = (err as Error).message || '删除失败'
  }
}

export async function addComment(id: string, body: string): Promise<boolean> {
  errorMessage.value = ''
  try {
    replaceItem(
      await api.addComment(id, { author: effectiveName.value, role: currentRole.value, body }),
    )
    return true
  } catch (err) {
    errorMessage.value = (err as Error).message || '评论失败'
    return false
  }
}

/** 附件上传 / 删除进行中 */
export const attachmentBusy = ref(false)
/** 附件相关错误，就近显示在附件区 */
export const attachmentError = ref('')

export async function uploadAttachments(id: string, files: File[]): Promise<void> {
  if (files.length === 0) return
  attachmentBusy.value = true
  attachmentError.value = ''
  try {
    for (const file of files) {
      replaceItem(await api.uploadAttachment(id, file))
    }
  } catch (err) {
    attachmentError.value = (err as Error).message || '附件上传失败'
  } finally {
    attachmentBusy.value = false
  }
}

export async function removeAttachment(id: string, attachmentId: string): Promise<void> {
  attachmentBusy.value = true
  attachmentError.value = ''
  try {
    replaceItem(await api.removeAttachment(id, attachmentId))
  } catch (err) {
    attachmentError.value = (err as Error).message || '附件删除失败'
  } finally {
    attachmentBusy.value = false
  }
}

export function clearAttachmentError(): void {
  attachmentError.value = ''
}

export function selectType(type: ItemType): void {
  activeType.value = type
  statusFilter.value = 'all'
  activeId.value = visibleItems.value[0]?.id ?? ''
}

export function selectStatus(status: StatusKey | 'all'): void {
  statusFilter.value = status
  if (!visibleItems.value.some((it) => it.id === activeId.value)) {
    activeId.value = visibleItems.value[0]?.id ?? ''
  }
}
