<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AttachmentField from './AttachmentField.vue'
import { ALL_PORTS_META, ITEM_TYPES, PORT_OPTIONS, STATUS_FLOW } from '@/constants'
import { activeType, composerOpen, createItem } from '@/store/board'
import { acceptFiles } from '@/utils/attachments'
import { imageFilesFromClipboard } from '@/utils/clipboard'
import type { Attachment, ItemType, PortKey, StatusKey } from '@/types'

/** 初始状态可选值：不含「已归档」（归档是后续流转动作，不是初始态） */
const INITIAL_STATUSES = STATUS_FLOW.filter((s) => s.key !== 'archived')

const type = ref<ItemType>('requirement')
const title = ref('')
const description = ref('')
const status = ref<StatusKey>('pending')
/** 适用端口，多选，必填；默认不选 */
const ports = ref<PortKey[]>([])
const busy = ref(false)
const err = ref('')
const pasteNote = ref('')

/** 待上传的文件，与预览列表按下标一一对应 */
const files = ref<File[]>([])
const previews = ref<Attachment[]>([])

const currentLabel = computed(() => ITEM_TYPES.find((t) => t.key === type.value)?.label ?? '需求')

/** 「全部」= 8080 和 8318 都选中 */
const allPorts = computed(() => ports.value.length === PORT_OPTIONS.length)

function togglePort(key: PortKey): void {
  ports.value = ports.value.includes(key)
    ? ports.value.filter((p) => p !== key)
    : [...ports.value, key]
}

function toggleAllPorts(): void {
  ports.value = allPorts.value ? [] : PORT_OPTIONS.map((p) => p.key)
}

function releaseAll(): void {
  for (const p of previews.value) URL.revokeObjectURL(p.url)
  previews.value = []
  files.value = []
}

watch(composerOpen, (open) => {
  if (!open) return
  type.value = activeType.value
  title.value = ''
  description.value = ''
  status.value = 'pending'
  ports.value = []
  err.value = ''
  pasteNote.value = ''
  busy.value = false
  releaseAll()
})

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && composerOpen.value && !busy.value) close()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function onAddFiles(picked: File[]): void {
  for (const file of picked) {
    files.value.push(file)
    previews.value.push({
      id: `pending_${files.value.length}_${file.name}`,
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    })
  }
}

function onRemoveFile(id: string): void {
  const idx = previews.value.findIndex((p) => p.id === id)
  if (idx < 0) return
  URL.revokeObjectURL(previews.value[idx].url)
  previews.value.splice(idx, 1)
  files.value.splice(idx, 1)
}

/** 描述框粘贴截图 → 进待上传附件 */
function onPasteDesc(event: ClipboardEvent): void {
  const images = imageFilesFromClipboard(event)
  if (images.length === 0) return
  event.preventDefault()
  err.value = ''
  const { accepted, error } = acceptFiles(images, previews.value.length)
  if (error) err.value = error
  if (accepted.length === 0) return
  onAddFiles(accepted)
  pasteNote.value = `已添加 ${accepted.length} 张截图`
}

function close(): void {
  if (busy.value) return
  releaseAll()
  composerOpen.value = false
}

async function submit(): Promise<void> {
  if (!title.value.trim()) {
    err.value = '请填写标题。'
    return
  }
  if (ports.value.length === 0) {
    err.value = '请选择适用端口（8080 / 8318 / 全部 至少选一项）。'
    return
  }
  busy.value = true
  err.value = ''
  pasteNote.value = ''

  const created = await createItem(
    {
      type: type.value,
      title: title.value.trim(),
      description: description.value.trim(),
      status: status.value,
      ports: [...ports.value],
    },
    files.value,
  )

  busy.value = false
  if (created) {
    releaseAll()
    composerOpen.value = false
  } else {
    err.value = '保存失败，请稍后重试。'
  }
}
</script>

<template>
  <div v-if="composerOpen" class="mask" @click.self="close">
    <div class="sheet" role="dialog" aria-modal="true">
      <header class="sheet-head">
        <div class="sheet-title">
          <span class="sheet-ico">
            <svg viewBox="0 0 18 18" width="15" height="15">
              <path d="M9 4v10M4 9h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
            </svg>
          </span>
          <span class="sheet-title-txt">
            <b>新建{{ currentLabel }}</b>
            <em>写清楚要做什么，开发照这个做</em>
          </span>
        </div>
        <button class="x" title="关闭" @click="close">
          <svg viewBox="0 0 16 16" width="15" height="15">
            <path
              d="M4.3 4.3l7.4 7.4M11.7 4.3l-7.4 7.4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <div class="sheet-body">
        <div class="grp">
          <span class="label">类型</span>
          <div class="segs">
            <button
              v-for="t in ITEM_TYPES"
              :key="t.key"
              class="seg"
              :class="{ 'seg--on': type === t.key }"
              @click="type = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="grp">
          <span class="label">适用端口</span>
          <div class="segs">
            <button
              v-for="p in PORT_OPTIONS"
              :key="p.key"
              class="seg"
              :class="{ 'seg--on': ports.includes(p.key) }"
              :style="ports.includes(p.key) ? { color: p.color, borderColor: p.border, background: p.bg } : {}"
              @click="togglePort(p.key)"
            >
              <i class="seg-dot" :style="{ background: p.color }" />
              {{ p.label }}
            </button>
            <button
              class="seg"
              :class="{ 'seg--on': allPorts }"
              :style="allPorts ? { color: ALL_PORTS_META.color, borderColor: ALL_PORTS_META.border, background: ALL_PORTS_META.bg } : {}"
              @click="toggleAllPorts"
            >
              <i class="seg-dot" :style="{ background: ALL_PORTS_META.color }" />
              {{ ALL_PORTS_META.label }}
            </button>
          </div>
          <span class="port-hint">必选，可多选；「全部」即同时选择 8080 与 8318</span>
        </div>

        <div class="grp">
          <label class="label" for="cmp-title">标题</label>
          <input
            id="cmp-title"
            v-model="title"
            class="field"
            placeholder="一句话说清要做什么"
            maxlength="120"
          />
        </div>

        <div class="grp">
          <label class="label" for="cmp-desc">描述</label>
          <textarea
            id="cmp-desc"
            v-model="description"
            class="field"
            rows="5"
            placeholder="背景、要求、验收标准…（可直接粘贴截图）"
            @paste="onPasteDesc"
          />
          <div class="desc-tools">
            <span class="paste-hint">
              支持粘贴截图
              <span class="kbd">⌘</span>
              <span class="kbd">V</span>
            </span>
            <span v-if="pasteNote" class="tool-note">{{ pasteNote }}</span>
          </div>
        </div>

        <div class="grp">
          <span class="label">附件</span>
          <AttachmentField :items="previews" @add="onAddFiles" @remove="onRemoveFile" />
        </div>

        <div class="grp">
          <span class="label">初始状态</span>
          <div class="segs segs--wrap">
            <button
              v-for="s in INITIAL_STATUSES"
              :key="s.key"
              class="seg"
              :class="{ 'seg--on': status === s.key }"
              :style="status === s.key ? { color: s.color, borderColor: s.border, background: s.bg } : {}"
              @click="status = s.key"
            >
              <i class="seg-dot" :style="{ background: s.color }" />
              {{ s.label }}
            </button>
          </div>
        </div>

        <p v-if="err" class="err">{{ err }}</p>
      </div>

      <footer class="sheet-foot">
        <span class="foot-hint">创建后可随时补充描述与附件</span>
        <span class="foot-acts">
          <button class="btn btn-ghost" :disabled="busy" @click="close">取消</button>
          <button
            class="btn btn-primary"
            :disabled="busy || !title.trim() || ports.length === 0"
            @click="submit"
          >
            {{ busy ? '保存中…' : '创建' }}
          </button>
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(13, 18, 28, 0.46);
  backdrop-filter: blur(3px);
  animation: mask-in 0.16s ease-out;
}

@keyframes mask-in {
  from {
    opacity: 0;
  }
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 580px;
  max-height: 88vh;
  border-radius: var(--r-lg);
  background: var(--panel);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: sheet-in 0.2s var(--ease);
}

@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 14px 20px;
  border-bottom: 1px solid var(--border);
}

.sheet-title {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.sheet-ico {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 9px;
  background: linear-gradient(150deg, var(--brand-hi), var(--brand));
  color: #fff;
  box-shadow: 0 2px 6px -1px rgba(30, 64, 175, 0.4);
}

.sheet-title-txt {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}

.sheet-title-txt b {
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sheet-title-txt em {
  font-style: normal;
  font-size: 11.5px;
  color: var(--text-3);
}

.x {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex: none;
  border-radius: 8px;
  color: var(--text-3);
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}

.x:hover {
  background: var(--panel-tint);
  color: var(--text);
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grp {
  display: flex;
  flex-direction: column;
}

.segs {
  display: flex;
  gap: 6px;
}

.segs--wrap {
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

.desc-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
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
  font-weight: 600;
  color: #047857;
}

.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 20px;
  border-top: 1px solid var(--border);
  background: var(--panel-soft);
}

.foot-hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.foot-acts {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
}

@media (max-width: 620px) {
  .foot-hint {
    display: none;
  }
}
</style>
