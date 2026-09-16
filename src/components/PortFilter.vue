<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { stepIndex } from '@/utils/select'
import type { PortKey } from '@/types'

export interface PortFilterOption {
  key: PortKey
  label: string
  color: string
  count: number
}

const props = defineProps<{
  modelValue: PortKey[]
  options: PortFilterOption[]
  /** 当前选中端口下匹配到的条目数（任一匹配口径，由父级计算避免重复计数） */
  matchedCount: number
}>()

const emit = defineEmits<{ 'update:modelValue': [PortKey[]] }>()

const open = ref(false)
const activeIndex = ref(0)
const root = ref<HTMLElement | null>(null)

/** 同一页面可能挂多个筛选器，id 需要唯一（aria-controls / aria-activedescendant 依赖它） */
const uid = `pf-${Math.random().toString(36).slice(2, 8)}`

/** 空选 = 不筛选；全选 = 两个端口都要（语义上仍按任一匹配过滤） */
const summary = computed(() => {
  if (props.modelValue.length === 1) {
    return props.options.find((o) => o.key === props.modelValue[0])?.label ?? '全部端口'
  }
  return '全部端口'
})

const summaryColor = computed(() => {
  if (props.modelValue.length === 1) {
    return props.options.find((o) => o.key === props.modelValue[0])?.color ?? '#1f2937'
  }
  return '#1f2937'
})

function isOn(key: PortKey): boolean {
  return props.modelValue.includes(key)
}

function toggleOption(key: PortKey): void {
  const next = isOn(key)
    ? props.modelValue.filter((k) => k !== key)
    : [...props.modelValue, key]
  emit('update:modelValue', next)
}

function toggle(): void {
  if (open.value) {
    open.value = false
    return
  }
  activeIndex.value = 0
  open.value = true
}

function move(step: number): void {
  if (!open.value) {
    open.value = true
    activeIndex.value = 0
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
  if (opt) toggleOption(opt.key)
}

/** 点面板之外收起 */
function onDocDown(e: MouseEvent): void {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown))
</script>

<template>
  <div ref="root" class="sf">
    <button
      type="button"
      class="sf-btn"
      :class="{ 'sf-btn--open': open }"
      role="combobox"
      aria-haspopup="listbox"
      aria-multiselectable="true"
      :aria-expanded="open"
      :aria-controls="uid"
      :aria-activedescendant="open ? `${uid}-opt-${activeIndex}` : undefined"
      aria-label="按适用端口筛选"
      @click="toggle"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="commit"
      @keydown.space.prevent="commit"
      @keydown.esc="open = false"
    >
      <i class="sf-dot" :style="{ background: summaryColor }" />
      <span class="sf-label">{{ summary }}</span>
      <span class="sf-count">{{ matchedCount }}</span>
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
      <ul v-if="open" :id="uid" class="sf-menu" role="listbox" aria-multiselectable="true" aria-label="适用端口筛选">
        <li
          v-for="(o, i) in options"
          :id="`${uid}-opt-${i}`"
          :key="o.key"
          class="sf-opt"
          :class="{ 'sf-opt--on': isOn(o.key), 'sf-opt--hl': i === activeIndex }"
          role="option"
          :aria-selected="isOn(o.key)"
          @mouseenter="activeIndex = i"
          @click="toggleOption(o.key)"
        >
          <span class="pf-box" :class="{ 'pf-box--on': isOn(o.key) }">
            <svg v-if="isOn(o.key)" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
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
          <i class="sf-opt-dot" :style="{ background: o.color }" />
          <span class="sf-opt-label">{{ o.label }}</span>
          <span class="sf-opt-count" :class="{ 'sf-opt-count--zero': o.count === 0 }">
            {{ o.count }}
          </span>
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

/* ---------- 触发器（与 StatusFilter 同一视觉语言） ---------- */
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

.pf-box {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  flex: none;
  border: 1.5px solid var(--border-strong);
  border-radius: 4px;
  background: #fff;
  color: transparent;
  transition: background 0.15s var(--ease), border-color 0.15s var(--ease), color 0.15s var(--ease);
}

.pf-box--on {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
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
