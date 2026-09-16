import { computed, ref } from 'vue'
import { api, type ItemPatch } from '@/api'
import { ROLE_LABEL, STATUS_SORT_ORDER } from '@/constants'
import { portProgress } from '@/utils/ports'
import type { Item, ItemDraft, ItemType, PortKey, Role, StatusKey } from '@/types'

/** 全局状态（模块级单例，组件直接引入使用） */
export const items = ref<Item[]>([])
export const errorMessage = ref('')
export const activeType = ref<ItemType>('requirement')
/** 归档视图：非 null 时中栏只显示该类型下 status='archived' 的条目 */
export const archivedView = ref<ItemType | null>(null)
export const activeId = ref('')
export const statusFilter = ref<StatusKey | 'all'>('all')
/** 适用端口筛选（多选）；空数组 = 不筛选 */
export const portFilter = ref<PortKey[]>([])
export const currentRole = ref<Role>(readRole())
/** 新建面板是否展开 */
export const composerOpen = ref(false)

function readRole(): Role {
  const v = localStorage.getItem('todo-board:role')
  // 兼容早期版本写入的 teacher / student
  if (v === 'developer' || v === 'student') return 'developer'
  return 'product'
}

/** 评论署名：固定用角色名，不做自定义 */
export const effectiveName = computed(() => ROLE_LABEL[currentRole.value])

export function setRole(role: Role): void {
  currentRole.value = role
  localStorage.setItem('todo-board:role', role)
}

/** 当前类型下各状态的数量（不含已归档，与主列表口径一致） */
export const statusCounts = computed<Record<StatusKey | 'all', number>>(() => {
  const base: Record<string, number> = { all: 0 }
  const scoped = items.value.filter(
    (it) => it.type === activeType.value && it.status !== 'archived',
  )
  base.all = scoped.length
  for (const it of scoped) base[it.status] = (base[it.status] ?? 0) + 1
  return base as Record<StatusKey | 'all', number>
})

/** 左侧两类各自的待办数量（不含验证通过、不含已归档） */
export const typeCounts = computed<Record<ItemType, { total: number; open: number }>>(() => {
  const mk = () => ({ total: 0, open: 0 })
  const out: Record<ItemType, { total: number; open: number }> = {
    requirement: mk(),
    defect: mk(),
  }
  for (const it of items.value) {
    if (it.status === 'archived') continue
    out[it.type].total += 1
    if (it.status !== 'passed') out[it.type].open += 1
  }
  return out
})

/** 两类各自的已归档数量 */
export const archivedCounts = computed<Record<ItemType, number>>(() => {
  const out: Record<ItemType, number> = { requirement: 0, defect: 0 }
  for (const it of items.value) {
    if (it.status === 'archived') out[it.type] += 1
  }
  return out
})

/** 左侧入口提醒：各类型「部分完成」的条目数（多端口只完成了其中一部分） */
export const partialCounts = computed<Record<ItemType, number>>(() => {
  const out: Record<ItemType, number> = { requirement: 0, defect: 0 }
  for (const it of items.value) {
    if (it.status === 'archived') continue
    if (portProgress(it.ports, it.donePorts).partial) out[it.type] += 1
  }
  return out
})

/** 当前视图的范围（归档视图：该类型已归档；主视图：该类型未归档），不含状态/端口筛选 */
const scopedItems = computed(() =>
  archivedView.value
    ? items.value.filter((it) => it.type === archivedView.value && it.status === 'archived')
    : items.value.filter((it) => it.type === activeType.value && it.status !== 'archived'),
)

/** 当前范围内含各端口的条目数（任一匹配口径，供端口筛选下拉展示） */
export const portCounts = computed<Record<PortKey, number>>(() => {
  const out: Record<PortKey, number> = { '8080': 0, '8318': 0 }
  for (const it of scopedItems.value) {
    for (const p of it.ports) {
      if (p === '8080' || p === '8318') out[p] += 1
    }
  }
  return out
})

/** 当前展示的列表 */
export const visibleItems = computed(() => {
  // 归档视图：状态恒为 archived，只按创建时间倒序
  if (archivedView.value) {
    return [...scopedItems.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  let list = scopedItems.value.filter(
    (it) => statusFilter.value === 'all' || it.status === statusFilter.value,
  )
  if (portFilter.value.length > 0) {
    list = list.filter((it) => it.ports.some((p) => portFilter.value.includes(p)))
  }
  // 主视图：先按状态权重（待处理、重新处理 → 开发中 → 待验证 → 验证通过），同状态内最新在前
  return list.sort(
    (a, b) =>
      STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
      b.createdAt.localeCompare(a.createdAt),
  )
})

export const activeItem = computed(() => items.value.find((it) => it.id === activeId.value) ?? null)

export async function refresh(): Promise<void> {
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
    archivedView.value = null
    statusFilter.value = 'all'
    portFilter.value = []
    activeId.value = created.id
    exitPick()
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

/** 切换某个端口是否已完成（完成标记只对适用端口有效） */
export async function toggleDonePort(id: string, port: PortKey): Promise<void> {
  const it = items.value.find((x) => x.id === id)
  if (!it) return
  const donePorts = it.donePorts.includes(port)
    ? it.donePorts.filter((p) => p !== port)
    : [...it.donePorts, port]
  await patchItem(id, { donePorts })
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
  archivedView.value = null
  statusFilter.value = 'all'
  portFilter.value = []
  activeId.value = visibleItems.value[0]?.id ?? ''
  // 显式清空选择：切换分类后旧选中项已不可见，留着容易误删
  exitPick()
}

/** 进入某类型的归档视图 */
export function selectArchived(type: ItemType): void {
  activeType.value = type
  archivedView.value = type
  statusFilter.value = 'all'
  portFilter.value = []
  activeId.value = visibleItems.value[0]?.id ?? ''
  exitPick()
}

export function selectStatus(status: StatusKey | 'all'): void {
  statusFilter.value = status
  if (!visibleItems.value.some((it) => it.id === activeId.value)) {
    activeId.value = visibleItems.value[0]?.id ?? ''
  }
}

/* ---------- 批量选择 ---------- */

/** 是否处于批量选择模式 */
export const picking = ref(false)
/** 已勾选的条目 id */
export const picked = ref<string[]>([])

/** 只认当前可见（当前分类 + 当前筛选）中被勾选的条目，避免删掉看不见的 */
export const pickedItems = computed(() =>
  visibleItems.value.filter((it) => picked.value.includes(it.id)),
)

/** 当前可见条目是否已全选 */
export const allPicked = computed(
  () => visibleItems.value.length > 0 && pickedItems.value.length === visibleItems.value.length,
)

export function startPick(): void {
  picking.value = true
  picked.value = []
}

export function exitPick(): void {
  picking.value = false
  picked.value = []
}

export function togglePick(id: string): void {
  picked.value = picked.value.includes(id)
    ? picked.value.filter((x) => x !== id)
    : [...picked.value, id]
}

export function togglePickAll(): void {
  picked.value = allPicked.value ? [] : visibleItems.value.map((it) => it.id)
}

/* ---------- 批量删除 ---------- */

/**
 * 批量删除。逐个调用删除接口，逐个更新本地列表，失败的汇总后提示。
 * 不新增后端接口：循环复用已有的 DELETE /api/items/:id。
 */
export async function deleteItems(ids: string[]): Promise<{ ok: number; failed: string[] }> {
  if (ids.length === 0) return { ok: 0, failed: [] }
  errorMessage.value = ''
  const failed: string[] = []
  let ok = 0
  for (const id of ids) {
    try {
      await api.remove(id)
      items.value = items.value.filter((it) => it.id !== id)
      ok += 1
    } catch {
      failed.push(id)
    }
  }
  if (failed.length > 0) {
    errorMessage.value = `有 ${failed.length} 条删除失败，请重试。`
  }
  if (activeId.value && !items.value.some((it) => it.id === activeId.value)) {
    activeId.value = visibleItems.value[0]?.id ?? ''
  }
  exitPick()
  return { ok, failed }
}
