<script setup lang="ts">
import { ref, watch } from 'vue'
import AttachmentField from './AttachmentField.vue'
import { ITEM_TYPES, STATUS_FLOW } from '@/constants'
import { activeType, composerOpen, createItem } from '@/store/board'
import type { Attachment, ItemType, StatusKey } from '@/types'

const type = ref<ItemType>('requirement')
const title = ref('')
const description = ref('')
const attachments = ref<Attachment[]>([])
const status = ref<StatusKey>('pending')
const busy = ref(false)
const err = ref('')

watch(composerOpen, (open) => {
  if (!open) return
  type.value = activeType.value
  title.value = ''
  description.value = ''
  attachments.value = []
  status.value = 'pending'
  err.value = ''
  busy.value = false
})

function close(): void {
  if (busy.value) return
  composerOpen.value = false
}

async function submit(): Promise<void> {
  if (!title.value.trim()) {
    err.value = '请填写标题。'
    return
  }
  busy.value = true
  err.value = ''
  const created = await createItem({
    type: type.value,
    title: title.value.trim(),
    description: description.value.trim(),
    status: status.value,
    attachments: attachments.value,
  })
  busy.value = false
  if (created) {
    composerOpen.value = false
  } else {
    err.value = '保存失败，请检查浏览器存储空间后重试。'
  }
}
</script>

<template>
  <div v-if="composerOpen" class="mask" @click.self="close" @keydown.esc="close">
    <div class="sheet" role="dialog" aria-modal="true">
      <header class="sheet-head">
        <h2>新建{{ ITEM_TYPES.find((t) => t.key === type)?.label }}</h2>
        <button class="x" title="关闭" @click="close">
          <svg viewBox="0 0 16 16" width="15" height="15">
            <path d="M4.3 4.3l7.4 7.4M11.7 4.3l-7.4 7.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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
            placeholder="背景、要求、验收标准…学生照这个做"
          />
        </div>

        <div class="grp">
          <span class="label">附件</span>
          <AttachmentField v-model="attachments" />
        </div>

        <div class="grp">
          <span class="label">初始状态</span>
          <div class="segs segs--wrap">
            <button
              v-for="s in STATUS_FLOW"
              :key="s.key"
              class="seg"
              :class="{ 'seg--on': status === s.key }"
              :style="status === s.key ? { color: s.color, borderColor: s.border, background: s.bg } : {}"
              @click="status = s.key"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <p v-if="err" class="err">{{ err }}</p>
      </div>

      <footer class="sheet-foot">
        <button class="btn btn-ghost" :disabled="busy" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="busy || !title.trim()" @click="submit">
          {{ busy ? '保存中…' : '创建' }}
        </button>
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
  background: rgba(19, 24, 33, 0.42);
  backdrop-filter: blur(2px);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 13px;
  border-bottom: 1px solid var(--border);
}

.sheet-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.x {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--text-3);
}

.x:hover {
  background: #eef1f5;
  color: var(--text);
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 17px 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
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
  height: 31px;
  padding: 0 13px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 13px;
  color: var(--text-2);
  transition: all 0.14s;
}

.seg:hover {
  border-color: #bcc6d2;
}

.seg--on {
  border-color: #1f2937;
  background: #1f2937;
  color: #fff;
  font-weight: 600;
}

.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 13px 20px;
  border-top: 1px solid var(--border);
  background: var(--panel-soft);
}

.err {
  margin: 0;
  font-size: 12.5px;
  color: var(--danger);
}
</style>
