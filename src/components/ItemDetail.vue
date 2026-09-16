<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StatusBadge from './StatusBadge.vue'
import AttachmentField from './AttachmentField.vue'
import CommentThread from './CommentThread.vue'
import ImageLightbox from './ImageLightbox.vue'
import { ALL_PORTS_META, PORT_OPTIONS, STATUS_FLOW, statusMeta, typeMeta } from '@/constants'
import {
  activeItem,
  attachmentBusy,
  attachmentError,
  clearAttachmentError,
  deleteItem,
  patchItem,
  removeAttachment,
  toggleDonePort,
  uploadAttachments,
} from '@/store/board'
import { acceptFiles } from '@/utils/attachments'
import { imageFilesFromClipboard, isImageMime } from '@/utils/clipboard'
import { formatDateTime } from '@/utils/format'
import { portProgress, portText } from '@/utils/ports'
import type { Attachment, PortKey, StatusKey } from '@/types'

const editing = ref(false)
const draftTitle = ref('')
const draftDesc = ref('')
const draftPorts = ref<PortKey[]>([])
const confirmDelete = ref(false)
const busy = ref(false)
const localError = ref('')
const pasteNote = ref('')
const viewer = ref<Attachment | null>(null)
const shotInput = ref<HTMLInputElement | null>(null)

watch(
  activeItem,
  (it) => {
    editing.value = false
    confirmDelete.value = false
    localError.value = ''
    pasteNote.value = ''
    viewer.value = null
    clearAttachmentError()
    if (it) {
      draftTitle.value = it.title
      draftDesc.value = it.description
      draftPorts.value = [...it.ports]
    }
  },
  { immediate: true },
)

const typeName = computed(() => (activeItem.value ? typeMeta(activeItem.value.type).label : ''))
const shortId = computed(() => activeItem.value?.id.replace(/^item_/, '').slice(0, 6).toUpperCase() ?? '')

/** 描述区展示的图片：附件中的图片部分 */
const shots = computed(() => (activeItem.value?.attachments ?? []).filter((a) => isImageMime(a.mime)))

/** 适用端口标签（逐个显示，便于辨认；「全部」= 两个标签都亮） */
const portTags = computed(() => {
  const ports = activeItem.value?.ports ?? []
  return ports
    .map((k) => PORT_OPTIONS.find((p) => p.key === k))
    .filter((p): p is (typeof PORT_OPTIONS)[number] => Boolean(p))
})

/** 端口完成进度（多端口分别完成时用于提示） */
const progress = computed(() => {
  const it = activeItem.value
  return portProgress(it?.ports ?? [], it?.donePorts ?? [])
})

const donePortsText = computed(() =>
  portText((activeItem.value?.ports ?? []).filter((p) => isPortDone(p))),
)

function isPortDone(key: PortKey): boolean {
  return (activeItem.value?.donePorts ?? []).includes(key)
}

/** 完成标记写入中（防连点：上一次未返回前不再发起，避免基于旧状态二次切换） */
const portBusy = ref(false)

async function onTogglePort(key: PortKey): Promise<void> {
  const it = activeItem.value
  if (!it || portBusy.value) return
  portBusy.value = true
  try {
    await toggleDonePort(it.id, key)
  } finally {
    portBusy.value = false
  }
}

/** 编辑态：「全部」= 8080 和 8318 都选中 */
const draftAllPorts = computed(() => draftPorts.value.length === PORT_OPTIONS.length)

function togglePort(key: PortKey): void {
  draftPorts.value = draftPorts.value.includes(key)
    ? draftPorts.value.filter((p) => p !== key)
    : [...draftPorts.value, key]
}

function toggleAllPorts(): void {
  draftPorts.value = draftAllPorts.value ? [] : PORT_OPTIONS.map((p) => p.key)
}

function startEdit(): void {
  const it = activeItem.value
  if (!it) return
  draftTitle.value = it.title
  draftDesc.value = it.description
  draftPorts.value = [...it.ports]
  editing.value = true
  localError.value = ''
  pasteNote.value = ''
}

function cancelEdit(): void {
  editing.value = false
  localError.value = ''
  pasteNote.value = ''
}

async function save(): Promise<void> {
  const it = activeItem.value
  if (!it) return
  const title = draftTitle.value.trim()
  if (!title) {
    localError.value = '标题不能为空。'
    return
  }
  if (draftPorts.value.length === 0) {
    localError.value = '请选择适用端口（8080 / 8318 / 全部 至少选一项）。'
    return
  }
  busy.value = true
  await patchItem(it.id, {
    title,
    description: draftDesc.value.trim(),
    ports: [...draftPorts.value],
  })
  busy.value = false
  editing.value = false
}

async function setStatus(key: StatusKey): Promise<void> {
  const it = activeItem.value
  if (!it || it.status === key || busy.value) return
  busy.value = true
  await patchItem(it.id, { status: key })
  busy.value = false
}

function onAddFiles(picked: File[]): void {
  const it = activeItem.value
  if (!it) return
  void uploadAttachments(it.id, picked)
}

function onRemoveAttachment(attachmentId: string): void {
  const it = activeItem.value
  if (!it) return
  if (viewer.value?.id === attachmentId) viewer.value = null
  void removeAttachment(it.id, attachmentId)
}

/** 在描述框粘贴截图：拦下图片，走附件通道，随即可在描述下方看到 */
async function onPasteDesc(event: ClipboardEvent): Promise<void> {
  const it = activeItem.value
  if (!it || !editing.value) return
  const images = imageFilesFromClipboard(event)
  if (images.length === 0) return

  event.preventDefault()
  localError.value = ''
  const { accepted, error } = acceptFiles(images, it.attachments.length)
  if (error) localError.value = error
  if (accepted.length === 0) return

  pasteNote.value = `正在上传 ${accepted.length} 张截图…`
  await uploadAttachments(it.id, accepted)
  pasteNote.value = attachmentError.value ? '' : `已添加 ${accepted.length} 张截图`
}

function pickShots(): void {
  shotInput.value?.click()
}

function onPickShots(event: Event): void {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (picked.length === 0) return
  localError.value = ''
  const { accepted, error } = acceptFiles(picked, activeItem.value?.attachments.length ?? 0)
  if (error) localError.value = error
  if (accepted.length > 0) onAddFiles(accepted)
}

async function doDelete(): Promise<void> {
  const it = activeItem.value
  if (!it) return
  busy.value = true
  await deleteItem(it.id)
  busy.value = false
  confirmDelete.value = false
}
</script>

<template>
  <section class="detail scroll">
    <div v-if="!activeItem" class="blank">
      <svg viewBox="0 0 48 48" width="48" height="48">
        <rect x="7" y="9" width="34" height="30" rx="4" fill="#fff" stroke="#d6dee9" stroke-width="1.6" />
        <path d="M14 18h20M14 25h20M14 32h12" stroke="#dee5ef" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <p class="blank-t">左侧选一条查看详情</p>
      <p class="blank-s">或点「新建」提出一条新的{{ typeName || '需求' }}</p>
    </div>

    <div v-else class="wrap">
      <!-- 头部 -->
      <header class="head">
        <div class="head-top">
          <span class="crumb">
            <span class="crumb-type">{{ typeName }}</span>
            <span class="crumb-id">#{{ shortId }}</span>
          </span>

          <div class="head-acts">
            <template v-if="!editing">
              <button class="btn btn-sm" @click="startEdit">
                <svg viewBox="0 0 16 16" width="13" height="13">
                  <path
                    d="M11.1 2.7 13.3 4.9 5.9 12.3l-2.9.7.7-2.9 7.4-7.4Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                </svg>
                编辑
              </button>
              <button
                v-if="!confirmDelete"
                class="btn btn-sm btn-danger-ghost"
                @click="confirmDelete = true"
              >
                删除
              </button>
              <template v-else>
                <span class="confirm-txt">确认删除？</span>
                <button class="btn btn-sm btn-danger-ghost" :disabled="busy" @click="doDelete">确认</button>
                <button class="btn btn-sm btn-ghost" @click="confirmDelete = false">取消</button>
              </template>
            </template>
            <template v-else>
              <button class="btn btn-sm btn-ghost" @click="cancelEdit">取消</button>
              <button class="btn btn-sm btn-primary" :disabled="busy" @click="save">
                {{ busy ? '保存中…' : '保存' }}
              </button>
            </template>
          </div>
        </div>

        <input
          v-if="editing"
          v-model="draftTitle"
          class="field title-input"
          placeholder="需求标题"
        />
        <h1 v-else class="title">{{ activeItem.title }}</h1>

        <div class="meta-row">
          <StatusBadge :status="activeItem.status" />
          <span class="meta-sep" />
          <span class="meta-time">
            <svg viewBox="0 0 16 16" width="12" height="12">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3" />
              <path d="M8 4.6V8l2.4 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
            创建于 {{ formatDateTime(activeItem.createdAt) }}
          </span>
          <span v-if="activeItem.updatedAt !== activeItem.createdAt" class="meta-time">
            更新于 {{ formatDateTime(activeItem.updatedAt) }}
          </span>
        </div>
      </header>

      <!-- 描述 -->
      <section class="block">
        <h3 class="block-t">
          <span class="block-ico">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M2.8 3.4h10.4M2.8 7h10.4M2.8 10.6h6.6"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
          </span>
          描述
        </h3>

        <div class="desc-card" :class="{ 'desc-card--edit': editing }">
          <textarea
            v-if="editing"
            v-model="draftDesc"
            class="desc-input"
            rows="6"
            placeholder="写清楚要做什么、验收标准是什么…（可直接粘贴截图）"
            @paste="onPasteDesc"
          />
          <p v-else-if="activeItem.description" class="desc">{{ activeItem.description }}</p>
          <p v-else class="desc desc--empty">（无描述）</p>
        </div>

        <div v-if="editing" class="desc-tools">
          <span class="paste-hint">
            支持直接粘贴截图
            <span class="kbd">⌘</span>
            <span class="kbd">V</span>
          </span>
          <button class="btn btn-sm btn-ghost" :disabled="attachmentBusy" @click="pickShots">
            选择图片…
          </button>
          <span v-if="attachmentBusy" class="tool-note tool-note--busy">上传中…</span>
          <span v-else-if="pasteNote" class="tool-note">{{ pasteNote }}</span>
        </div>

        <div v-if="shots.length || attachmentBusy" class="shots">
          <button
            v-for="s in shots"
            :key="s.id"
            class="shot"
            :title="`${s.name} · 点击看大图`"
            @click="viewer = s"
          >
            <img :src="s.url" :alt="s.name" loading="lazy" />
            <span class="shot-zoom">
              <svg viewBox="0 0 16 16" width="13" height="13">
                <circle cx="7.2" cy="7.2" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5" />
                <path d="M10.4 10.4 13.6 13.6M7.2 5.4v3.6M5.4 7.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
              </svg>
            </span>
          </button>
          <span v-if="attachmentBusy" class="shot shot--skel" />
        </div>

        <input ref="shotInput" type="file" accept="image/*" multiple class="hidden-input" @change="onPickShots" />

        <p v-if="localError" class="err">{{ localError }}</p>
      </section>

      <!-- 附件 -->
      <section class="block">
        <h3 class="block-t">
          <span class="block-ico">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M10.6 5.1 6 9.7a1.3 1.3 0 0 0 1.8 1.8l4.6-4.6a2.7 2.7 0 0 0-3.8-3.8L3.7 7.3a4 4 0 0 0 5.7 5.7l4-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.35"
                stroke-linecap="round"
              />
            </svg>
          </span>
          附件
          <span v-if="activeItem.attachments.length" class="block-n">{{ activeItem.attachments.length }}</span>
        </h3>
        <AttachmentField
          :items="activeItem.attachments"
          :busy="attachmentBusy"
          :server-error="attachmentError"
          @add="onAddFiles"
          @remove="onRemoveAttachment"
          @preview="viewer = $event"
        />
      </section>

      <!-- 适用端口 -->
      <section class="block">
        <h3 class="block-t">
          <span class="block-ico">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <rect x="2.6" y="3.2" width="10.8" height="9.6" rx="2" fill="none" stroke="currentColor" stroke-width="1.35" />
              <circle cx="5.4" cy="6.2" r="0.9" fill="currentColor" />
              <circle cx="5.4" cy="9.8" r="0.9" fill="currentColor" />
              <path d="M8 6.2h3.2M8 9.8h3.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </span>
          适用端口
          <span v-if="progress.partial" class="block-note block-note--warn">部分完成</span>
        </h3>

        <div v-if="editing" class="segs">
          <button
            v-for="p in PORT_OPTIONS"
            :key="p.key"
            class="seg"
            :class="{ 'seg--on': draftPorts.includes(p.key) }"
            :style="draftPorts.includes(p.key) ? { color: p.color, borderColor: p.border, background: p.bg } : {}"
            @click="togglePort(p.key)"
          >
            <i class="seg-dot" :style="{ background: p.color }" />
            {{ p.label }}
          </button>
          <button
            class="seg"
            :class="{ 'seg--on': draftAllPorts }"
            :style="draftAllPorts ? { color: ALL_PORTS_META.color, borderColor: ALL_PORTS_META.border, background: ALL_PORTS_META.bg } : {}"
            @click="toggleAllPorts"
          >
            <i class="seg-dot" :style="{ background: ALL_PORTS_META.color }" />
            {{ ALL_PORTS_META.label }}
          </button>
        </div>

        <div v-else class="port-view">
          <template v-if="portTags.length">
            <button
              v-for="p in portTags"
              :key="p.key"
              class="port-tag port-tag--lg port-tag--btn"
              :class="{ 'port-tag--done': isPortDone(p.key), 'port-tag--pending': progress.partial && !isPortDone(p.key) }"
              :style="{ color: p.color, background: p.bg, borderColor: p.border }"
              :aria-pressed="isPortDone(p.key)"
              :title="isPortDone(p.key) ? '点击取消完成标记' : '点击标记该端口已完成'"
              @click="onTogglePort(p.key)"
            >
              <svg v-if="isPortDone(p.key)" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                <path
                  d="M3.4 8.5l3 2.9 6.2-6.6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ p.label }}
            </button>
            <span v-if="progress.total > 1" class="port-ratio">{{ progress.done }} / {{ progress.total }}</span>
          </template>
          <span v-else class="port-empty">（未指定）</span>
        </div>

        <p v-if="portTags.length" class="port-tip">点端口标签可标记该端口的完成情况</p>

        <p v-if="progress.partial" class="port-alert port-alert--warn">
          <span class="port-alert-ico">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" />
              <path d="M8 4.9v3.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
            </svg>
          </span>
          <b>{{ donePortsText }}</b> 已完成，<b>{{ portText(progress.pending) }}</b> 待完成
        </p>
        <p v-else-if="progress.allDone && progress.total > 1" class="port-alert port-alert--ok">
          <span class="port-alert-ico">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" />
              <path
                d="M5.2 8.3l2 2 3.6-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          {{ portText(activeItem.ports) }} 均已标记完成
        </p>
      </section>

      <!-- 状态 -->
      <section class="block">
        <h3 class="block-t">
          <span class="block-ico">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path d="M4 13.4V2.9h7.6l-1.3 2.4 1.3 2.4H4" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" />
            </svg>
          </span>
          状态
          <span class="block-note">{{ statusMeta(activeItem.status).hint }}</span>
        </h3>
        <div class="flow">
          <button
            v-for="s in STATUS_FLOW"
            :key="s.key"
            class="flow-btn"
            :class="{ 'flow-btn--on': activeItem.status === s.key }"
            :style="
              activeItem.status === s.key
                ? { background: s.bg, borderColor: s.border, color: s.color }
                : {}
            "
            :disabled="busy"
            @click="setStatus(s.key)"
          >
            <i class="flow-dot" :style="{ background: s.color }" />
            {{ s.label }}
          </button>
        </div>
      </section>

      <!-- 完成情况 -->
      <section class="block block--last">
        <h3 class="block-t">
          <span class="block-ico">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M13.4 8.6a4.9 4.9 0 0 1-5.3 4.9L4.2 14.3l.9-3a4.9 4.9 0 1 1 8.3-2.7Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.35"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          完成情况
          <span v-if="activeItem.comments.length" class="block-n">{{ activeItem.comments.length }}</span>
        </h3>
        <CommentThread :item-id="activeItem.id" :comments="activeItem.comments" />
      </section>
    </div>

    <ImageLightbox
      v-if="viewer"
      :src="viewer.url"
      :name="viewer.name"
      @close="viewer = null"
    />
  </section>
</template>

<style scoped>
.detail {
  flex: 1;
  min-width: 0;
  background: var(--panel);
}

.wrap {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 30px 60px;
}

/* ---------- 空态 ---------- */
.blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
  padding: 40px;
  color: var(--text-3);
}

.blank-t {
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

.blank-s {
  margin: 0;
  font-size: 12.5px;
}

/* ---------- 头部 ---------- */
.head {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  margin-bottom: 10px;
}

.crumb {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.crumb-type {
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--panel-tint);
  color: var(--text-2);
  font-weight: 600;
}

.crumb-id {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.head-acts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.confirm-txt {
  font-size: 12.5px;
  color: var(--danger);
  font-weight: 600;
}

.title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.title-input {
  margin-bottom: 12px;
  padding: 10px 13px;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ---------- 适用端口 ---------- */
.segs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.seg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: #fff;
  font-size: 13px;
  color: var(--text-2);
  box-shadow: var(--shadow-xs);
  transition: all 0.15s var(--ease);
}

.seg:hover {
  border-color: #b9c4d3;
  background: var(--panel-soft);
}

.seg--on {
  border-color: #1f2937;
  background: #1f2937;
  color: #fff;
  font-weight: 600;
}

.seg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-sep {
  width: 1px;
  height: 13px;
  background: var(--border-strong);
}

.meta-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-3);
}

.port-view {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.port-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border: 1px solid;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.port-tag--lg {
  height: 26px;
  padding: 0 11px;
  border-radius: 7px;
  font-size: 13px;
}

/* 可点击的完成标记 */
.port-tag--btn {
  gap: 4px;
  cursor: pointer;
  transition: transform 0.12s var(--ease), box-shadow 0.15s var(--ease), opacity 0.15s var(--ease);
}

.port-tag--btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.port-tag--done {
  box-shadow: inset 0 0 0 1px currentColor;
}

.port-tag--pending {
  opacity: 0.55;
}

.port-ratio {
  margin-left: 2px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.port-tip {
  margin: 9px 0 0;
  font-size: 11.5px;
  color: var(--text-3);
}

/* 部分完成 / 全部完成的提示条 */
.port-alert {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 0 0;
  padding: 9px 12px;
  border: 1px solid;
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.5;
}

.port-alert b {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.port-alert-ico {
  display: grid;
  place-items: center;
  flex: none;
}

.port-alert--warn {
  border-color: #fbe4b8;
  background: #fffbeb;
  color: #92400e;
}

.port-alert--ok {
  border-color: #bbe7d4;
  background: #ecfdf5;
  color: #047857;
}

.block-note--warn {
  color: #b45309;
  font-weight: 600;
}

.port-empty {
  font-size: 13px;
  color: var(--text-3);
}

/* ---------- 区块 ---------- */
.block {
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.block--last {
  border-bottom: none;
  padding-bottom: 0;
}

.block-t {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.005em;
}

.block-ico {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 6px;
  background: var(--panel-tint);
  color: var(--text-2);
}

.block-n {
  display: inline-grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--brand-weak);
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.block-note {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}

/* ---------- 描述 ---------- */
.desc-card {
  padding: 13px 15px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--panel-inset);
}

.desc-card--edit {
  padding: 0;
  border-color: transparent;
  background: transparent;
}

.desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.desc--empty {
  color: var(--text-3);
}

.desc-input {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  background: #fff;
  line-height: 1.75;
  outline: none;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.desc-input:hover {
  border-color: #c2cbd9;
}

.desc-input:focus {
  border-color: var(--brand);
  box-shadow: var(--ring);
}

.desc-input::placeholder {
  color: var(--text-3);
}

.desc-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  flex-wrap: wrap;
}

.paste-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.tool-note {
  font-size: 12px;
  color: #047857;
  font-weight: 600;
}

.tool-note--busy {
  color: var(--brand);
}

/* ---------- 截图预览 ---------- */
.shots {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.shot {
  position: relative;
  width: 108px;
  height: 108px;
  flex: none;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--panel-inset);
  overflow: hidden;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease), transform 0.15s var(--ease);
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.shot:hover {
  border-color: var(--brand-line);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.shot-zoom {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s var(--ease);
}

.shot:hover .shot-zoom {
  opacity: 1;
}

.shot--skel {
  background: linear-gradient(100deg, #f1f5f9 30%, #e7edf5 50%, #f1f5f9 70%);
  background-size: 220% 100%;
  animation: skel 1.1s linear infinite;
}

@keyframes skel {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -120% 0;
  }
}

.hidden-input {
  display: none;
}

/* ---------- 状态流转 ---------- */
.flow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.flow-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 33px;
  padding: 0 13px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: var(--text-2);
  box-shadow: var(--shadow-xs);
  transition: border-color 0.15s var(--ease), background 0.15s var(--ease), transform 0.1s var(--ease);
}

.flow-btn:hover:not(:disabled) {
  border-color: #b9c4d3;
  background: var(--panel-soft);
  transform: translateY(-1px);
}

.flow-btn--on {
  font-weight: 700;
  box-shadow: var(--shadow-xs), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.flow-btn--on:hover {
  transform: none;
}

.flow-btn:disabled {
  cursor: default;
  opacity: 0.75;
}

.flow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

@media (max-width: 1180px) {
  .wrap {
    padding: 20px 22px 52px;
  }
}
</style>
