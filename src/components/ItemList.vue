<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { STATUS_FLOW, statusMeta, typeMeta } from '@/constants'
import {
  activeId,
  activeType,
  composerOpen,
  statusCounts,
  statusFilter,
  selectStatus,
  visibleItems,
} from '@/store/board'
import { relativeTime } from '@/utils/format'
import type { StatusKey } from '@/types'

const heading = computed(() => typeMeta(activeType.value).label)

const filters = computed(() => [
  { key: 'all' as const, label: '全部', count: statusCounts.value.all, color: '#1f2937' },
  ...STATUS_FLOW.map((s) => ({
    key: s.key as StatusKey,
    label: s.label,
    count: statusCounts.value[s.key] ?? 0,
    color: s.color,
  })),
])

function excerpt(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 58 ? `${t.slice(0, 58)}…` : t || '（无描述）'
}
</script>

<template>
  <section class="list">
    <div class="list-head">
      <div class="head-txt">
        <h2>{{ heading }}</h2>
        <span class="head-n">{{ visibleItems.length }} / {{ statusCounts.all }}</span>
      </div>
      <button class="btn btn-sm" @click="composerOpen = true">
        <svg viewBox="0 0 16 16" width="13" height="13">
          <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        新建
      </button>
    </div>

    <div class="filters">
      <button
        v-for="f in filters"
        :key="f.key"
        class="chip"
        :class="{ 'chip--on': statusFilter === f.key }"
        :style="statusFilter === f.key ? { '--chip': f.color } : {}"
        @click="selectStatus(f.key)"
      >
        <i v-if="f.key !== 'all'" class="chip-dot" :style="{ background: f.color }" />
        {{ f.label }}
        <span class="chip-n">{{ f.count }}</span>
      </button>
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
          {{ statusFilter === 'all' ? `还没有${heading}` : '这个状态下没有条目' }}
        </p>
        <p class="empty-s">点上方「新建」写一条</p>
      </div>

      <button
        v-for="it in visibleItems"
        :key="it.id"
        class="card"
        :class="{ 'card--on': activeId === it.id }"
        :style="{ '--accent': statusMeta(it.status).color }"
        @click="activeId = it.id"
      >
        <span class="card-accent" />

        <div class="card-top">
          <span class="card-title">{{ it.title }}</span>
          <StatusBadge :status="it.status" size="sm" />
        </div>

        <p class="card-desc">{{ excerpt(it.description) }}</p>

        <div class="card-foot">
          <span class="metas">
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

/* ---------- 筛选 ---------- */
.filters {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: none;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.filters::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 12.5px;
  color: var(--text-2);
  white-space: nowrap;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease), color 0.15s var(--ease),
    box-shadow 0.15s var(--ease);
}

.chip:hover {
  border-color: var(--border-strong);
  background: var(--panel-soft);
}

.chip--on {
  background: var(--chip);
  border-color: var(--chip);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.chip--on .chip-dot {
  background: #fff !important;
  opacity: 0.9;
}

.chip-n {
  font-size: 11px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
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
  width: 100%;
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

.time {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
