<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { STATUS_FLOW, typeMeta } from '@/constants'
import {
  activeId,
  activeItem,
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
  { key: 'all' as const, label: '全部', count: statusCounts.value.all },
  ...STATUS_FLOW.map((s) => ({
    key: s.key as StatusKey,
    label: s.label,
    count: statusCounts.value[s.key] ?? 0,
  })),
])

function excerpt(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 62 ? `${t.slice(0, 62)}…` : t || '（无描述）'
}
</script>

<template>
  <section class="list">
    <div class="list-head">
      <h2>{{ heading }}</h2>
      <button class="btn btn-sm" @click="composerOpen = true">新建</button>
    </div>

    <div class="filters scroll">
      <button
        v-for="f in filters"
        :key="f.key"
        class="chip"
        :class="{ 'chip--on': statusFilter === f.key }"
        @click="selectStatus(f.key)"
      >
        {{ f.label }}
        <span class="chip-n">{{ f.count }}</span>
      </button>
    </div>

    <div class="list-body scroll">
      <p v-if="visibleItems.length === 0" class="empty">
        这里还没有内容。<br />
        点上方「新建」写一条。
      </p>

      <button
        v-for="it in visibleItems"
        :key="it.id"
        class="card"
        :class="{ 'card--on': activeId === it.id }"
        @click="activeId = it.id"
      >
        <div class="card-top">
          <span class="card-title">{{ it.title }}</span>
          <StatusBadge :status="it.status" size="sm" />
        </div>

        <p class="card-desc">{{ excerpt(it.description) }}</p>

        <div class="card-foot">
          <span class="metas">
            <span v-if="it.attachments.length" class="meta">
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
            <span v-if="it.comments.length" class="meta">
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
  width: 322px;
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 16px 11px;
}

.list-head h2 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
}

.filters {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: wrap;
  max-height: 96px;
  border-bottom: 1px solid var(--border);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 12.5px;
  color: var(--text-2);
  transition: all 0.14s;
  white-space: nowrap;
}

.chip:hover {
  border-color: var(--border-strong);
  background: #f8fafb;
}

.chip--on {
  background: #1f2937;
  border-color: #1f2937;
  color: #fff;
  font-weight: 600;
}

.chip-n {
  font-size: 11px;
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
}

.list-body {
  flex: 1;
  min-height: 0;
  padding: 11px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--panel-soft);
}

.empty {
  margin: 42px 16px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.9;
}

.card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.card--on {
  border-color: var(--brand);
  box-shadow: 0 0 0 2.5px rgba(37, 99, 235, 0.12);
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
  margin: 0 0 8px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.58;
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
  gap: 9px;
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
