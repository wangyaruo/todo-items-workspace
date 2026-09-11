<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_ATTACHMENTS_PER_ITEM, MAX_ATTACHMENT_BYTES } from '@/constants'
import { extOf, formatSize } from '@/utils/format'
import type { Attachment } from '@/types'

const props = withDefaults(
  defineProps<{ items: Attachment[]; editable?: boolean; busy?: boolean; serverError?: string }>(),
  { editable: true, busy: false, serverError: '' },
)

const emit = defineEmits<{
  add: [files: File[]]
  remove: [id: string]
}>()

const localError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const canAdd = computed(
  () => props.editable && !props.busy && props.items.length < MAX_ATTACHMENTS_PER_ITEM,
)

const errorText = computed(() => localError.value || props.serverError)

function pick(): void {
  fileInput.value?.click()
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  localError.value = ''
  if (files.length === 0) return

  const room = MAX_ATTACHMENTS_PER_ITEM - props.items.length
  const accepted: File[] = []

  for (const file of files) {
    if (accepted.length >= room) {
      localError.value = `每条最多 ${MAX_ATTACHMENTS_PER_ITEM} 个附件。`
      break
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      localError.value = `「${file.name}」${formatSize(file.size)}，超过单文件 ${formatSize(MAX_ATTACHMENT_BYTES)} 上限。`
      continue
    }
    accepted.push(file)
  }

  if (accepted.length > 0) emit('add', accepted)
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}
</script>

<template>
  <div class="att">
    <div v-if="items.length" class="att-list">
      <div v-for="a in items" :key="a.id" class="att-item">
        <span class="att-thumb">
          <img v-if="isImage(a.mime)" :src="a.url" :alt="a.name" />
          <span v-else class="att-ext">{{ extOf(a.name) }}</span>
        </span>

        <span class="att-info">
          <span class="att-name" :title="a.name">{{ a.name }}</span>
          <span class="att-size">{{ formatSize(a.size) }}</span>
        </span>

        <a class="att-act" :href="a.url" :download="a.name" target="_blank" rel="noopener" title="下载">
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

        <button
          v-if="editable"
          class="att-act att-act--del"
          title="移除"
          :disabled="busy"
          @click="emit('remove', a.id)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <p v-else-if="!editable" class="att-none">无附件</p>

    <button v-if="canAdd" class="att-add" :disabled="busy" @click="pick">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" />
      </svg>
      {{ busy ? '上传中…' : '上传附件' }}
    </button>

    <input ref="fileInput" type="file" multiple class="att-input" @change="onPick" />

    <p v-if="errorText" class="att-err">{{ errorText }}</p>
    <p v-else-if="editable" class="att-hint">
      单文件 ≤ {{ formatSize(MAX_ATTACHMENT_BYTES) }}，最多 {{ MAX_ATTACHMENTS_PER_ITEM }} 个
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

.att-add:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-weak);
}

.att-add:disabled {
  opacity: 0.6;
  cursor: default;
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
