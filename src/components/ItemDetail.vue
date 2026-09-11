<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StatusBadge from './StatusBadge.vue'
import AttachmentField from './AttachmentField.vue'
import CommentThread from './CommentThread.vue'
import { STATUS_FLOW, statusMeta, typeMeta } from '@/constants'
import { activeItem, deleteItem, patchItem } from '@/store/board'
import { formatDateTime } from '@/utils/format'
import type { Attachment, StatusKey } from '@/types'

const editing = ref(false)
const draftTitle = ref('')
const draftDesc = ref('')
const draftAtts = ref<Attachment[]>([])
const confirmDelete = ref(false)
const busy = ref(false)
const localError = ref('')

watch(
  activeItem,
  (it) => {
    editing.value = false
    confirmDelete.value = false
    localError.value = ''
    if (it) {
      draftTitle.value = it.title
      draftDesc.value = it.description
      draftAtts.value = [...it.attachments]
    }
  },
  { immediate: true },
)

const typeName = computed(() => (activeItem.value ? typeMeta(activeItem.value.type).label : ''))
const shortId = computed(() => activeItem.value?.id.replace(/^item_/, '').slice(0, 6).toUpperCase() ?? '')

function startEdit(): void {
  const it = activeItem.value
  if (!it) return
  draftTitle.value = it.title
  draftDesc.value = it.description
  draftAtts.value = [...it.attachments]
  editing.value = true
  localError.value = ''
}

function cancelEdit(): void {
  editing.value = false
  localError.value = ''
}

async function save(): Promise<void> {
  const it = activeItem.value
  if (!it) return
  const title = draftTitle.value.trim()
  if (!title) {
    localError.value = '标题不能为空。'
    return
  }
  busy.value = true
  await patchItem(it.id, {
    title,
    description: draftDesc.value.trim(),
    attachments: draftAtts.value,
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
      <svg viewBox="0 0 48 48" width="46" height="46">
        <rect x="7" y="9" width="34" height="30" rx="3" fill="none" stroke="#cbd4df" stroke-width="1.6" />
        <path d="M14 18h20M14 25h20M14 32h12" stroke="#dbe3ec" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <p class="blank-t">左侧选一条查看详情</p>
      <p class="blank-s">或点「新建」提出一条新的{{ typeName || '需求' }}</p>
    </div>

    <template v-else>
      <!-- 头部 -->
      <header class="head">
        <div class="head-top">
          <span class="crumb">
            <span class="crumb-type">{{ typeName }}</span>
            <span class="crumb-id">#{{ shortId }}</span>
          </span>

          <div class="head-acts">
            <template v-if="!editing">
              <button class="btn btn-sm" @click="startEdit">编辑</button>
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
          <span class="meta-time">创建于 {{ formatDateTime(activeItem.createdAt) }}</span>
          <span v-if="activeItem.updatedAt !== activeItem.createdAt" class="meta-time">
            · 更新于 {{ formatDateTime(activeItem.updatedAt) }}
          </span>
        </div>
      </header>

      <!-- 描述 -->
      <section class="block">
        <h3 class="block-t">描述</h3>
        <textarea
          v-if="editing"
          v-model="draftDesc"
          class="field desc-input"
          rows="5"
          placeholder="写清楚要做什么、验收标准是什么…"
        />
        <p v-else-if="activeItem.description" class="desc">{{ activeItem.description }}</p>
        <p v-else class="desc desc--empty">（无描述）</p>
      </section>

      <!-- 附件 -->
      <section class="block">
        <h3 class="block-t">
          附件
          <span v-if="activeItem.attachments.length" class="block-n">{{ activeItem.attachments.length }}</span>
        </h3>
        <AttachmentField
          :model-value="editing ? draftAtts : activeItem.attachments"
          :editable="editing"
          @update:model-value="draftAtts = $event"
        />
        <p v-if="localError" class="err">{{ localError }}</p>
      </section>

      <!-- 状态流转 -->
      <section class="block">
        <h3 class="block-t">状态</h3>
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
        <p class="flow-hint">{{ statusMeta(activeItem.status).hint }}</p>
      </section>

      <!-- 评论区 -->
      <section class="block block--last">
        <h3 class="block-t">
          完成情况
          <span v-if="activeItem.comments.length" class="block-n">{{ activeItem.comments.length }}</span>
        </h3>
        <CommentThread :item-id="activeItem.id" :comments="activeItem.comments" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.detail {
  flex: 1;
  min-width: 0;
  padding: 20px 26px 40px;
}

/* 空态 */
.blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  color: var(--text-3);
}

.blank-t {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

.blank-s {
  margin: 0;
  font-size: 13px;
}

/* 头部 */
.head {
  padding-bottom: 17px;
  border-bottom: 1px solid var(--border);
}

.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  margin-bottom: 9px;
}

.crumb {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.crumb-type {
  padding: 2px 8px;
  border-radius: 5px;
  background: #eef1f5;
  color: var(--text-2);
  font-weight: 600;
}

.crumb-id {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
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
  margin: 0 0 11px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.42;
  letter-spacing: -0.01em;
  word-break: break-word;
}

.title-input {
  margin-bottom: 11px;
  font-size: 19px;
  font-weight: 600;
  padding: 9px 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.meta-sep {
  width: 1px;
  height: 13px;
  background: var(--border-strong);
}

.meta-time {
  font-size: 12.5px;
  color: var(--text-3);
}

/* 区块 */
.block {
  padding: 19px 0;
  border-bottom: 1px solid var(--border);
}

.block--last {
  border-bottom: none;
}

.block-t {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 11px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.01em;
}

.block-n {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #eef1f5;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
}

.desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.78;
  white-space: pre-wrap;
  word-break: break-word;
}

.desc--empty {
  color: var(--text-3);
}

.desc-input {
  line-height: 1.7;
}

/* 状态流转 */
.flow {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.flow-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 31px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: var(--text-2);
  transition: all 0.14s;
}

.flow-btn:hover:not(:disabled) {
  border-color: #bcc6d2;
  background: #f8fafb;
}

.flow-btn--on {
  font-weight: 700;
}

.flow-btn--on:hover {
  background: inherit;
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

.flow-hint {
  margin: 9px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
}

.err {
  margin: 9px 0 0;
  font-size: 12px;
  color: var(--danger);
}

@media (max-width: 1180px) {
  .detail {
    padding: 18px 20px 36px;
  }
}
</style>
