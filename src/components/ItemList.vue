<script setup lang="ts">
import { computed, ref } from 'vue'
import StatusBadge from './StatusBadge.vue'
import StatusFilter from './StatusFilter.vue'
import PortFilter from './PortFilter.vue'
import { PORT_OPTIONS, STATUS_FLOW, statusMeta, typeMeta } from '@/constants'
import {
  activeId,
  activeType,
  allPicked,
  archivedView,
  composerOpen,
  deleteItems,
  exitPick,
  pickedItems,
  picking,
  portCounts,
  portFilter,
  startPick,
  statusCounts,
  statusFilter,
  selectStatus,
  togglePick,
  togglePickAll,
  visibleItems,
} from '@/store/board'
import { relativeTime } from '@/utils/format'
import type { StatusKey } from '@/types'

const heading = computed(() =>
  archivedView.value ? `已归档${typeMeta(activeType.value).label}` : typeMeta(activeType.value).label,
)

const filters = computed(() => [
  { key: 'all' as const, label: '全部', count: statusCounts.value.all, color: '#1f2937' },
  ...STATUS_FLOW.filter((s) => s.key !== 'archived').map((s) => ({
    key: s.key as StatusKey,
    label: s.label,
    count: statusCounts.value[s.key] ?? 0,
    color: s.color,
  })),
])

/** 端口筛选下拉的选项（计数 = 当前范围内含该端口的条目数） */
const portOptions = computed(() =>
  PORT_OPTIONS.map((p) => ({
    key: p.key,
    label: p.label,
    color: p.color,
    count: portCounts.value[p.key] ?? 0,
  })),
)

/** 当前选中端口下匹配到的条目数（任一匹配，避免双端口条目被重复计数） */
const portMatchedCount = computed(() => visibleItems.value.length)

/** 批量删除的二次确认 */
const confirming = ref(false)
/** 单条删除的二次确认（存 id，行内替换卡片） */
const pendingId = ref('')
const busy = ref(false)

function isPicked(id: string): boolean {
  return pickedItems.value.some((it) => it.id === id)
}

/** 批量模式下点卡片是勾选，不是切换详情 */
function onCardClick(id: string): void {
  pendingId.value = ''
  if (picking.value) {
    confirming.value = false
    togglePick(id)
    return
  }
  activeId.value = id
}

function onToggleAll(): void {
  confirming.value = false
  togglePickAll()
}

function onExit(): void {
  confirming.value = false
  exitPick()
}

function askDelete(id: string): void {
  confirming.value = false
  pendingId.value = id
}

async function doDeleteOne(id: string): Promise<void> {
  if (busy.value) return
  busy.value = true
  await deleteItems([id])
  busy.value = false
  pendingId.value = ''
}

async function onDeletePicked(): Promise<void> {
  const ids = pickedItems.value.map((it) => it.id)
  if (ids.length === 0 || busy.value) return
  busy.value = true
  await deleteItems(ids)
  busy.value = false
  confirming.value = false
}

function excerpt(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 58 ? `${t.slice(0, 58)}…` : t || '（无描述）'
}

/** 卡片上的端口小标签 */
function portTags(ports: string[] | undefined) {
  return (ports ?? [])
    .map((k) => PORT_OPTIONS.find((p) => p.key === k))
    .filter((p): p is (typeof PORT_OPTIONS)[number] => Boolean(p))
}
</script>

<template>
  <section class="list">
    <div class="list-head">
      <div class="head-txt">
        <h2>{{ heading }}</h2>
        <span class="head-n">
          {{ archivedView ? visibleItems.length : `${visibleItems.length} / ${statusCounts.all}` }}
        </span>
      </div>
      <div class="head-acts">
        <button
          v-if="!picking"
          class="btn btn-sm"
          :disabled="visibleItems.length === 0"
          title="多选后批量删除"
          @click="startPick"
        >
          <svg viewBox="0 0 16 16" width="13" height="13">
            <path
              d="M3 4.6l1.3 1.3 2.1-2.3M3 9.4l1.3 1.3 2.1-2.3M9.2 5.3h3.9M9.2 10h3.9"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          批量
        </button>
        <button class="btn btn-sm" @click="composerOpen = true">
          <svg viewBox="0 0 16 16" width="13" height="13">
            <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          新建
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <StatusFilter
        v-if="!archivedView"
        :model-value="statusFilter"
        :options="filters"
        @update:model-value="selectStatus"
      />
      <PortFilter v-model="portFilter" :options="portOptions" :matched-count="portMatchedCount" />
    </div>

    <div v-if="picking" class="bulkbar" :class="{ 'bulkbar--danger': confirming }">
      <template v-if="!confirming">
        <button class="bulk-all" @click="onToggleAll">
          {{ allPicked ? '取消全选' : '全选' }}
        </button>
        <span class="bulk-n">
          已选
          <b>{{ pickedItems.length }}</b>
          项
        </span>
        <span class="bulk-spacer" />
        <button
          class="btn btn-sm btn-danger-ghost"
          :disabled="pickedItems.length === 0"
          @click="confirming = true"
        >
          删除
        </button>
        <button class="btn btn-sm btn-ghost" @click="onExit">取消</button>
      </template>
      <template v-else>
        <span class="confirm-txt">确认删除 {{ pickedItems.length }} 项？</span>
        <span class="bulk-spacer" />
        <button class="btn btn-sm btn-danger" :disabled="busy" @click="onDeletePicked">
          {{ busy ? '删除中…' : '确认' }}
        </button>
        <button class="btn btn-sm btn-ghost" :disabled="busy" @click="confirming = false">取消</button>
      </template>
    </div>

    <div class="list-body scroll">
      <div v-if="visibleItems.length === 0" class="empty">
        <svg viewBox="0 0 40 40" width="38" height="38">
          <rect x="6" y="8" width="28" height="24" rx="3.5" fill="none" stroke="#ccd5e2" stroke-width="1.5" />
          <path d="M12 16h16M12 22h11" stroke="#dde4ee" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="30" cy="30" r="6.5" fill="#fff" stroke="#ccd5e2" stroke-width="1.5" />
          <path d="M30 27.2v5.6M27.2 30h5.6" stroke="#b9c4d4" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <p class="empty-t">
          {{
            archivedView
              ? `还没有已归档的${typeMeta(activeType).label}`
              : portFilter.length > 0
                ? '选中的端口下没有条目'
                : statusFilter === 'all'
                  ? `还没有${heading}`
                  : '这个状态下没有条目'
          }}
        </p>
        <p class="empty-s">
          {{
            archivedView
              ? '详情页把状态改为「已归档」后会出现在这里'
              : portFilter.length > 0
                ? '换个端口组合试试，或取消勾选查看全部'
                : '点上方「新建」写一条'
          }}
        </p>
      </div>

      <div
        v-for="it in visibleItems"
        :key="it.id"
        class="row"
        :class="{ 'row--picked': isPicked(it.id) }"
      >
        <label v-if="picking" class="pick" :title="isPicked(it.id) ? '取消选择' : '选择'">
          <input type="checkbox" :checked="isPicked(it.id)" @change="onCardClick(it.id)" />
          <span class="pick-box">
            <svg viewBox="0 0 16 16" width="10" height="10">
              <path
                d="M3.4 8.5l3 2.9 6.2-6.6"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </label>

        <div v-if="pendingId === it.id" class="row-confirm">
          <span class="row-confirm-t">删除「{{ it.title }}」？</span>
          <button class="btn btn-sm btn-danger" :disabled="busy" @click="doDeleteOne(it.id)">
            {{ busy ? '…' : '确认' }}
          </button>
          <button class="btn btn-sm btn-ghost" :disabled="busy" @click="pendingId = ''">取消</button>
        </div>

        <button
          v-else
          class="card"
          :class="{ 'card--on': activeId === it.id && !picking }"
          :style="{ '--accent': statusMeta(it.status).color }"
          @click="onCardClick(it.id)"
        >
          <span class="card-accent" />

          <div class="card-top">
            <span class="card-title">{{ it.title }}</span>
            <StatusBadge :status="it.status" size="sm" />
          </div>

          <p class="card-desc">{{ excerpt(it.description) }}</p>

          <div class="card-foot">
            <span class="metas">
              <span v-if="portTags(it.ports).length" class="port-tags">
                <span
                  v-for="p in portTags(it.ports)"
                  :key="p.key"
                  class="port-tag"
                  :style="{ color: p.color, background: p.bg, borderColor: p.border }"
                >
                  {{ p.label }}
                </span>
              </span>
              <span v-if="it.attachments.length" class="meta" title="附件">
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path
                    d="M10.6 5.1 6 9.7a1.3 1.3 0 0 0 1.8 1.8l4.6-4.6a2.7 2.7 0 0 0-3.8-3.8L3.7 7.3a4 4 0 0 0 5.7 5.7l4-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
                {{ it.attachments.length }}
              </span>
              <span v-if="it.comments.length" class="meta" title="完成情况">
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path
                    d="M13.4 8.6a4.9 4.9 0 0 1-5.3 4.9L4.2 14.3l.9-3a4.9 4.9 0 1 1 8.3-2.7Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ it.comments.length }}
              </span>
            </span>
            <span class="time">{{ relativeTime(it.createdAt) }}</span>
          </div>
        </button>

        <button
          v-if="!picking && pendingId !== it.id"
          class="row-del"
          title="删除这条"
          @click="askDelete(it.id)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path
              d="M3.1 4.6h9.8M6.5 4.6V3.1h3v1.5M4.6 4.6l.6 8.3h5.6l.6-8.3M6.8 7v3.6M9.2 7v3.6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.35"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.list {
  width: 336px;
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel-soft);
  border-right: 1px solid var(--border);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 14px 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.head-txt {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.list-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.head-n {
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.head-acts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

/* ---------- 筛选 ---------- */
.filter-bar {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 10px 12px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

/* ---------- 批量操作条 ---------- */
.bulkbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--brand-weak);
  border-bottom: 1px solid var(--brand-line);
  animation: bulk-in 0.16s var(--ease);
}

.bulkbar--danger {
  background: var(--danger-weak);
  border-bottom-color: var(--danger-line);
}

@keyframes bulk-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.bulk-all {
  height: 25px;
  padding: 0 8px;
  border-radius: var(--r-xs);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand);
  transition: background 0.15s var(--ease);
}

.bulk-all:hover {
  background: rgba(43, 86, 216, 0.1);
}

.bulkbar--danger .bulk-all {
  color: var(--danger);
}

.bulk-n {
  font-size: 12.5px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.bulk-n b {
  color: var(--text);
  font-weight: 700;
}

.bulk-spacer {
  flex: 1;
}

.confirm-txt {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--danger);
}

/* ---------- 列表 ---------- */
.list-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

/* 勾选列（仅批量模式出现） */
.pick {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  cursor: pointer;
}

.pick input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.pick-box {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--border-strong);
  border-radius: 5px;
  background: #fff;
  color: transparent;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease), color 0.15s var(--ease);
}

.pick:hover .pick-box {
  border-color: var(--brand);
}

.row--picked .pick-box {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

/* 删除列（悬停显形） */
.row-del {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  border-radius: var(--r-xs);
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.15s var(--ease), background 0.15s var(--ease), color 0.15s var(--ease);
}

.row:hover .row-del,
.row-del:focus-visible {
  opacity: 1;
}

.row-del:hover {
  background: var(--danger-weak);
  color: var(--danger);
}

/* 单条删除的行内确认 */
.row-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--danger-line);
  border-radius: var(--r-md);
  background: var(--danger-weak);
  animation: bulk-in 0.16s var(--ease);
}

.row-confirm-t {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  color: #a52222;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: 46px 16px;
  text-align: center;
  color: var(--text-3);
}

.empty-t {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.empty-s {
  margin: 0;
  font-size: 12px;
}

.card {
  position: relative;
  display: block;
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: 12px 13px 11px 16px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: #fff;
  box-shadow: var(--shadow-xs);
  overflow: hidden;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease), transform 0.15s var(--ease);
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.card--on,
.card--on:hover {
  border-color: var(--brand);
  box-shadow: 0 0 0 2.5px rgba(43, 86, 216, 0.13), var(--shadow-sm);
}

.row--picked .card {
  border-color: var(--brand-line);
  background: #fbfdff;
  box-shadow: var(--shadow-xs);
  transform: none;
}

.card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
  opacity: 0.55;
  transition: opacity 0.15s var(--ease), width 0.15s var(--ease);
}

.card:hover .card-accent,
.card--on .card-accent {
  opacity: 1;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.card-title {
  font-weight: 600;
  line-height: 1.45;
  word-break: break-word;
}

.card-desc {
  margin: 0 0 9px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.6;
  word-break: break-word;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.metas {
  display: inline-flex;
  gap: 10px;
  color: var(--text-3);
  font-size: 11.5px;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.port-tags {
  display: inline-flex;
  gap: 4px;
}

.port-tag {
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 6px;
  border: 1px solid;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.time {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
