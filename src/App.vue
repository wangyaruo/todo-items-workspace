<script setup lang="ts">
import { computed } from 'vue'
import SidePane from './components/SidePane.vue'
import ItemList from './components/ItemList.vue'
import ItemDetail from './components/ItemDetail.vue'
import ItemComposer from './components/ItemComposer.vue'
import { ROLE_LABEL } from './constants'
import { apiMode } from '@/api'
import { currentRole, effectiveName, errorMessage, items } from './store/board'

const total = computed(() => items.value.length)
const open = computed(() => items.value.filter((it) => it.status !== 'passed').length)
const passed = computed(() => total.value - open.value)
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 18 18" width="17" height="17">
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
          <em>产品提需求 · 开发回完成情况</em>
        </span>
      </div>

      <div class="top-right">
        <span class="pills">
          <span class="pill">
            <b>{{ total }}</b>
            条总数
          </span>
          <span class="pill pill--open">
            <b>{{ open }}</b>
            未完成
          </span>
          <span class="pill pill--done">
            <b>{{ passed }}</b>
            已通过
          </span>
        </span>

        <span v-if="apiMode === 'local'" class="mode-tag" title="数据仅存在本机浏览器，两人之间不互通">
          本地模式
        </span>

        <span class="who" :class="`who--${currentRole}`">
          <i class="who-dot" />
          {{ effectiveName }}
          <em>{{ ROLE_LABEL[currentRole] }}</em>
        </span>
      </div>
    </header>

    <p v-if="errorMessage" class="errbar">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4" />
        <path d="M8 5.1v3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="8" cy="11" r="0.85" fill="currentColor" />
      </svg>
      {{ errorMessage }}
    </p>

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

/* ---------- 顶栏 ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 58px;
  flex: none;
  padding: 0 16px;
  background: linear-gradient(180deg, #ffffff, #fcfdff);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-xs);
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.mark {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: none;
  border-radius: 9px;
  background: linear-gradient(150deg, var(--brand-hi), var(--brand) 62%, var(--brand-deep));
  color: #fff;
  box-shadow: 0 2px 6px -1px rgba(30, 64, 175, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.brand-txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.brand-txt b {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-txt em {
  font-style: normal;
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.pills {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px;
  border-radius: 999px;
  background: var(--panel-tint);
}

.pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  height: 24px;
  padding: 0 11px;
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-xs);
  font-size: 12px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pill b {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.pill--open b {
  color: var(--brand);
}

.pill--done b {
  color: #047857;
}

.mode-tag {
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: #fff7e6;
  border: 1px solid #f5e0b3;
  color: #96660c;
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
}

.who {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 12px 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: var(--shadow-xs);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

.who em {
  font-style: normal;
  font-weight: 500;
  color: var(--text-3);
}

.who-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--product);
  box-shadow: 0 0 0 3px rgba(59, 111, 212, 0.16);
}

.who--developer .who-dot {
  background: var(--developer);
  box-shadow: 0 0 0 3px rgba(20, 134, 111, 0.16);
}

/* ---------- 错误条 ---------- */
.errbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 9px 18px;
  flex: none;
  background: #fef4f4;
  border-bottom: 1px solid var(--danger-line);
  color: #a52222;
  font-size: 12.5px;
}

.errbar svg {
  flex: none;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1080px) {
  .brand-txt em {
    display: none;
  }

  .pills {
    display: none;
  }
}

@media (max-width: 820px) {
  .mode-tag {
    display: none;
  }
}
</style>
