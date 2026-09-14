<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { indexOfKey, stepIndex } from '@/utils/select'
import type { FilterOption, StatusKey } from '@/types'

const props = defineProps<{
  modelValue: StatusKey | 'all'
  options: FilterOption[]
}>()

const emit = defineEmits<{ 'update:modelValue': [StatusKey | 'all'] }>()

const open = ref(false)
const activeIndex = ref(0)
const root = ref<HTMLElement | null>(null)

/** 同一页面可能挂多个筛选器，id 需要唯一（aria-controls / aria-activedescendant 依赖它） */
const uid = `sf-${Math.random().toString(36).slice(2, 8)}`

const current = computed(
  () => props.options.find((o) => o.key === props.modelValue) ?? props.options[0] ?? null,
)

function syncActive(): void {
  activeIndex.value = indexOfKey(props.options, props.modelValue)
}

function toggle(): void {
  if (open.value) {
    open.value = false
    return
  }
  syncActive()
  open.value = true
}

function pick(key: StatusKey | 'all'): void {
  open.value = false
  if (key !== props.modelValue) emit('update:modelValue', key)
}

function move(step: number): void {
  if (!open.value) {
    syncActive()
    open.value = true
    return
  }
  activeIndex.value = stepIndex(activeIndex.value, step, props.options.length)
}

function commit(): void {
  if (!open.value) {
    toggle()
    return
  }
  const opt = props.options[activeIndex.value]
  if (opt) pick(opt.key)
}

/** 点面板之外收起 */
function onDocDown(e: MouseEvent): void {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown))

/** 外部改值（如切换分类时重置筛选）后重新定位高亮 */
watch(() => props.modelValue, syncActive)
watch(() => props.options, syncActive)
</script>

<template>
  <div ref="root" class="sf">
    <button
      type="button"
      class="sf-btn"
      :class="{ 'sf-btn--open': open }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="uid"
      :aria-activedescendant="open ? `${uid}-opt-${activeIndex}` : undefined"
      aria-label="按状态筛选"
      @click="toggle"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="commit"
      @keydown.space.prevent="commit"
      @keydown.esc="open = false"
    >
      <i class="sf-dot" :style="{ background: current?.color }" />
      <span class="sf-label">{{ current?.label ?? '全部' }}</span>
      <span class="sf-count">{{ current?.count ?? 0 }}</span>
      <svg
        class="sf-caret"
        :class="{ 'sf-caret--open': open }"
        viewBox="0 0 16 16"
        width="12"
        height="12"
        aria-hidden="true"
      >
        <path
          d="M4.4 6.2 8 9.8l3.6-3.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <transition name="sf-pop">
      <ul v-if="open" :id="uid" class="sf-menu" role="listbox" aria-label="状态筛选">
        <li
          v-for="(o, i) in options"
          :id="`${uid}-opt-${i}`"
          :key="o.key"
          class="sf-opt"
          :class="{ 'sf-opt--on': o.key === modelValue, 'sf-opt--hl': i === activeIndex }"
          role="option"
          :aria-selected="o.key === modelValue"
          @mouseenter="activeIndex = i"
          @click="pick(o.key)"
        >
          <i class="sf-opt-dot" :style="{ background: o.color }" />
          <span class="sf-opt-label">{{ o.label }}</span>
          <span class="sf-opt-count" :class="{ 'sf-opt-count--zero': o.count === 0 }">
            {{ o.count }}
          </span>
          <svg
            v-if="o.key === modelValue"
            class="sf-check"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
          >
            <path
              d="M3.4 8.5l3 2.9 6.2-6.6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.sf {
  position: relative;
  flex: 1;
  min-width: 0;
}

/* ---------- 触发器 ---------- */
.sf-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  background: #fff;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}

.sf-btn:hover {
  border-color: var(--brand);
}

.sf-btn--open {
  border-color: var(--brand);
  box-shadow: var(--ring);
}

.sf-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.sf-label {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  margin-left: auto;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--panel-tint);
  font-size: 11px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.sf-caret {
  flex: none;
  color: var(--text-3);
  transition: transform 0.18s var(--ease), color 0.15s var(--ease);
}

.sf-caret--open {
  transform: rotate(180deg);
  color: var(--brand);
}

/* ---------- 面板 ---------- */
.sf-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: #fff;
  box-shadow: var(--shadow-md);
  transform-origin: top center;
}

.sf-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-radius: var(--r-xs);
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
  transition: background 0.12s var(--ease), color 0.12s var(--ease);
}

.sf-opt--hl {
  background: var(--panel-soft);
}

.sf-opt--on {
  background: var(--brand-weak);
  color: var(--brand-deep);
  font-weight: 600;
}

.sf-opt--on.sf-opt--hl {
  background: #e3ebff;
}

.sf-opt-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.sf-opt-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-opt-count {
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.sf-opt-count--zero {
  opacity: 0.5;
}

.sf-check {
  flex: none;
  color: var(--brand);
}

/* ---------- 展开动效 ---------- */
.sf-pop-enter-active,
.sf-pop-leave-active {
  transition: opacity 0.13s var(--ease), transform 0.13s var(--ease);
}

.sf-pop-enter-from,
.sf-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}
</style>
