<script setup lang="ts">
import { ITEM_TYPES } from '@/constants'
import { activeType, currentRole, composerOpen, selectType, setRole, typeCounts } from '@/store/board'
import type { Role } from '@/types'

const ROLES: { key: Role; label: string }[] = [
  { key: 'teacher', label: '老师' },
  { key: 'student', label: '学生' },
]
</script>

<template>
  <aside class="side">
    <div class="group-title">清单</div>

    <button
      v-for="t in ITEM_TYPES"
      :key="t.key"
      class="nav"
      :class="{ 'nav--active': activeType === t.key }"
      @click="selectType(t.key)"
    >
      <span class="nav-ico">
        <svg v-if="t.key === 'requirement'" viewBox="0 0 16 16" width="15" height="15">
          <path
            d="M3.2 2.6h6.3L12.6 5.7v7.7a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1v-9.8a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path d="M9.3 2.7v3.1h3.2" fill="none" stroke="currentColor" stroke-width="1.3" />
          <path d="M4.4 8.4h6M4.4 10.8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="15" height="15">
          <path
            d="M8 2.3 14.3 13.1H1.7L8 2.3Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
          <path d="M8 6.7v2.9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          <circle cx="8" cy="11.3" r="0.78" fill="currentColor" />
        </svg>
      </span>

      <span class="nav-txt">
        <span class="nav-name">{{ t.label }}</span>
        <span class="nav-sub">{{ typeCounts[t.key].open }} 项未完成</span>
      </span>

      <span class="nav-count">{{ typeCounts[t.key].total }}</span>
    </button>

    <div class="spacer" />

    <div class="group-title">当前身份</div>
    <div class="role-switch">
      <button
        v-for="r in ROLES"
        :key="r.key"
        class="role-btn"
        :class="{ 'role-btn--on': currentRole === r.key }"
        @click="setRole(r.key)"
      >
        {{ r.label }}
      </button>
    </div>
    <p class="role-note">仅用于评论署名，不做权限限制。</p>

    <button class="btn btn-primary new-btn" @click="composerOpen = true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      新建
    </button>
  </aside>
</template>

<style scoped>
.side {
  width: 208px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 16px 12px;
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.group-title {
  padding: 0 8px;
  margin: 6px 0 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--text-3);
  text-transform: uppercase;
}

.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background 0.14s;
}

.nav:hover {
  background: #f2f5f9;
}

.nav--active {
  background: var(--brand-weak);
}

.nav-ico {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  background: #eef1f5;
  color: var(--text-2);
}

.nav--active .nav-ico {
  background: var(--brand);
  color: #fff;
}

.nav-txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.nav-name {
  font-weight: 600;
  line-height: 1.3;
}

.nav-sub {
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.4;
}

.nav--active .nav-sub {
  color: #6a8bd6;
}

.nav-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.nav--active .nav-count {
  color: var(--brand);
}

.spacer {
  flex: 1;
  min-height: 18px;
}

.role-switch {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  background: #eef1f5;
}

.role-btn {
  flex: 1;
  height: 26px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
}

.role-btn--on {
  background: #fff;
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.role-note {
  margin: 7px 2px 0;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}

.new-btn {
  justify-content: center;
  margin-top: 12px;
  height: 34px;
}
</style>
