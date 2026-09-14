<script setup lang="ts">
import { ITEM_TYPES, ROLE_LABEL } from '@/constants'
import { activeType, currentRole, composerOpen, selectType, setRole, typeCounts } from '@/store/board'
import type { Role } from '@/types'

/** 选项与称呼都来自 ROLE_LABEL，角色文案只在那处定义一次 */
const ROLES = (Object.keys(ROLE_LABEL) as Role[]).map((key) => ({ key, label: ROLE_LABEL[key] }))
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
    <p class="role-note">仅用于评论署名，不做权限限制</p>

    <button class="btn btn-primary new-btn" @click="composerOpen = true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
      新建{{ activeType === 'defect' ? '缺陷' : '需求' }}
    </button>
  </aside>
</template>

<style scoped>
.side {
  width: 218px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 16px 12px 14px;
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.group-title {
  padding: 0 9px;
  margin: 4px 0 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  color: var(--text-3);
  text-transform: uppercase;
}

.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--r-md);
  text-align: left;
  transition: background 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.nav + .nav {
  margin-top: 3px;
}

.nav:hover {
  background: var(--panel-soft);
}

.nav--active {
  background: var(--brand-weak);
  box-shadow: inset 0 0 0 1px var(--brand-line);
}

.nav-ico {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 8px;
  background: var(--panel-tint);
  color: var(--text-2);
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}

.nav--active .nav-ico {
  background: linear-gradient(150deg, var(--brand-hi), var(--brand));
  color: #fff;
  box-shadow: 0 1px 3px rgba(30, 64, 175, 0.35);
}

.nav-txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.35;
}

.nav-name {
  font-weight: 600;
}

.nav-sub {
  font-size: 11.5px;
  color: var(--text-3);
}

.nav--active .nav-sub {
  color: #5c7fd0;
}

.nav-count {
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--panel-tint);
  color: var(--text-2);
  font-size: 11.5px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.nav--active .nav-count {
  background: #fff;
  color: var(--brand);
  box-shadow: var(--shadow-xs);
}

.spacer {
  flex: 1;
  min-height: 18px;
}

.role-switch {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: var(--panel-tint);
}

.role-btn {
  flex: 1;
  height: 27px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  transition: background 0.15s var(--ease), color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.role-btn:hover {
  color: var(--text);
}

.role-btn--on {
  background: #fff;
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.role-note {
  margin: 8px 3px 0;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}

.new-btn {
  justify-content: center;
  margin-top: 14px;
  height: 36px;
  font-weight: 600;
}
</style>
