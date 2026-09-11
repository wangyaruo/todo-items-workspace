<script setup lang="ts">
import { computed } from 'vue'
import { statusMeta } from '@/constants'
import type { StatusKey } from '@/types'

const props = withDefaults(defineProps<{ status: StatusKey; size?: 'sm' | 'md' }>(), { size: 'md' })

const meta = computed(() => statusMeta(props.status))
</script>

<template>
  <span
    class="badge"
    :class="`badge--${props.size}`"
    :style="{ color: meta.color, background: meta.bg, borderColor: meta.border }"
  >
    <i class="dot" :style="{ background: meta.color }" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}

.badge--md {
  height: 23px;
  padding: 0 10px;
  font-size: 12.5px;
}

.badge--sm {
  height: 20px;
  padding: 0 8px;
  font-size: 11.5px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
</style>
