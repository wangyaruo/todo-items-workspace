<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

/** 图片大图查看：点击遮罩或按 Esc 关闭 */
defineProps<{ src: string; name: string }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="lb" role="dialog" aria-modal="true" @click.self="emit('close')">
    <header class="lb-bar">
      <span class="lb-name" :title="name">{{ name }}</span>
      <span class="lb-acts">
        <a class="lb-act" :href="src" :download="name" target="_blank" rel="noopener">下载原图</a>
        <button class="lb-act" @click="emit('close')">关闭 (Esc)</button>
      </span>
    </header>
    <img class="lb-img" :src="src" :alt="name" @click.stop />
  </div>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 18px 18px 32px;
  background: rgba(9, 13, 22, 0.86);
  backdrop-filter: blur(6px);
  animation: lb-in 0.16s ease-out;
}

@keyframes lb-in {
  from {
    opacity: 0;
  }
}

.lb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 1080px;
  flex: none;
}

.lb-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.lb-acts {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.lb-act {
  display: inline-flex;
  align-items: center;
  height: 29px;
  padding: 0 11px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12.5px;
  text-decoration: none;
  transition: background 0.14s, border-color 0.14s;
}

.lb-act:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.lb-img {
  max-width: min(1080px, 94vw);
  max-height: calc(100vh - 130px);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.6);
  object-fit: contain;
}
</style>
