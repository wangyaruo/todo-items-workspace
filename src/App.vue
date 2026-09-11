<script setup lang="ts">
import { computed } from 'vue'
import SidePane from './components/SidePane.vue'
import ItemList from './components/ItemList.vue'
import ItemDetail from './components/ItemDetail.vue'
import ItemComposer from './components/ItemComposer.vue'
import { ROLE_LABEL } from './constants'
import { currentRole, effectiveName, errorMessage, items } from './store/board'

const total = computed(() => items.value.length)
const open = computed(() => items.value.filter((it) => it.status !== 'passed').length)
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 18 18" width="16" height="16">
            <path
              d="M3.4 4.6l1.7 1.7 3-3.2M3.4 11.2l1.7 1.7 3-3.2M10.4 5.4h4.4M10.4 12h4.4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="brand-txt">
          <b>需求协作板</b>
          <em>老师提需求 · 学生回完成情况</em>
        </span>
      </div>

      <div class="top-right">
        <span class="stat">共 {{ total }} 条</span>
        <span class="stat-sep" />
        <span class="stat">未完成 {{ open }} 条</span>
        <span class="stat-sep" />
        <span class="who">
          <i class="who-dot" :class="`who-dot--${currentRole}`" />
          {{ effectiveName }}（{{ ROLE_LABEL[currentRole] }}）
        </span>
      </div>
    </header>

    <p v-if="errorMessage" class="errbar">{{ errorMessage }}</p>

    <main class="main">
      <SidePane />
      <ItemList />
      <ItemDetail />
    </main>

    <ItemComposer />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 54px;
  flex: none;
  padding: 0 18px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mark {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex: none;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
}

.brand-txt {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.brand-txt b {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-txt em {
  font-style: normal;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.stat {
  font-size: 12.5px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.stat-sep {
  width: 1px;
  height: 12px;
  background: var(--border-strong);
}

.who {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}

.who-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.who-dot--teacher {
  background: #3b6fd4;
}

.who-dot--student {
  background: #14866f;
}

.errbar {
  margin: 0;
  padding: 8px 18px;
  flex: none;
  background: #fdf2f2;
  border-bottom: 1px solid #f7d4d4;
  color: #a52222;
  font-size: 12.5px;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 980px) {
  .brand-txt em {
    display: none;
  }

  .stat-sep,
  .stat:first-of-type {
    display: none;
  }
}
</style>
