<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_ATTACHMENTS_PER_ITEM, MAX_ATTACHMENT_BYTES } from '@/constants'
import { extOf, formatSize, uid } from '@/utils/format'
import type { Attachment } from '@/types'

const props = withDefaults(
  defineProps<{ modelValue: Attachment[]; editable?: boolean; dense?: boolean }>(),
  { editable: true, dense: false },
)
const emit = defineEmits<{ 'update:modelValue': [Attachment[]] }>()

const localError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const canAdd = computed(() => props.editable && props.modelValue.length < MAX_ATTACHMENTS_PER_ITEM)

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function onPick(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  localError.value = ''
  if (files.length === 0) return

  const next = [...props.modelValue]
  for (const file of files) {
    if (next.length >= MAX_ATTACHMENTS_PER_ITEM) {
      localError.value = `每条最多 ${MAX_ATTACHMENTS_PER_ITEM} 个附件。`
      break
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      localError.value = `「${file.name}」${formatSize(file.size)}，超过单文件 ${formatSize(MAX_ATTACHMENT_BYTES)} 上限。`
      continue
    }
    try {
      next.push({
        id: uid('att'),
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        dataUrl: await readAsDataURL(file),
        uploadedAt: new Date().toISOString(),
      })
    } catch {
      localError.value = `「${file.name}」读取失败，请重试。`
    }
  }

  emit('update:modelValue', next)
  input.value = ''
}

function remove(id: string): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((a) => a.id !== id),
  )
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}
</script>

<template>
  <div class="att">
    <div v-if="modelValue.length" class="att-list">
      <div v-for="a in modelValue" :key="a.id" class="att-item" :class="{ 'att-item--dense': dense }">
        <span class="att-thumb">
          <img v-if="isImage(a.mime)" :src="a.dataUrl" :alt="a.name" />
          <span v-else class="att-ext">{{ extOf(a.name) }}</span>
        </span>

        <span class="att-info">
          <span class="att-name" :title="a.name">{{ a.name }}</span>
          <span class="att-size">{{ formatSize(a.size) }}</span>
        </span>

        <a class="att-act" :href="a.dataUrl" :download="a.name" title="下载">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path
              d="M8 2.6v7.2M5.2 7.2 8 10l2.8-2.8M3.4 12.6h9.2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.35"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>

        <button v-if="editable" class="att-act att-act--del" title="移除" @click="remove(a.id)">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <p v-else-if="!editable" class="att-none">无附件</p>

    <button v-if="canAdd" class="att-add" @click="fileInput?.click()">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" />
      </svg>
      上传附件
    </button>

    <input
      ref="fileInput"
      type="file"
      multiple
      class="att-input"
      @change="onPick"
    />

    <p v-if="localError" class="att-err">{{ localError }}</p>
    <p v-else-if="editable" class="att-hint">
      支持任意格式，单文件 ≤ {{ formatSize(MAX_ATTACHMENT_BYTES) }}，最多 {{ MAX_ATTACHMENTS_PER_ITEM }} 个
    </p>
  </div>
</template>

<style scoped>
.att {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.att-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.att-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-soft);
}

.att-thumb {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 6px;
  overflow: hidden;
  background: #e8ecf1;
}

.att-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.att-ext {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.02em;
}

.att-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.att-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.att-size {
  font-size: 11.5px;
  color: var(--text-3);
}

.att-act {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 6px;
  color: var(--text-3);
  transition: background 0.14s, color 0.14s;
}

.att-act:hover {
  background: #e4e8ee;
  color: var(--text);
}

.att-act--del:hover {
  background: #fdecec;
  color: var(--danger);
}

.att-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  height: 31px;
  padding: 0 12px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: 13px;
  transition: all 0.14s;
}

.att-add:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-weak);
}

.att-input {
  display: none;
}

.att-none {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.att-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-3);
}

.att-err {
  margin: 0;
  font-size: 12px;
  color: var(--danger);
}
</style>
