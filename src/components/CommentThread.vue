<script setup lang="ts">
import { computed, ref } from 'vue'
import { ROLE_LABEL } from '@/constants'
import { addComment, currentRole, effectiveName } from '@/store/board'
import { formatDateTime } from '@/utils/format'
import type { Comment } from '@/types'

const props = defineProps<{ itemId: string; comments: Comment[] }>()

const body = ref('')
const submitting = ref(false)
const localError = ref('')

const roleLabel = computed(() => ROLE_LABEL[currentRole.value])

async function submit(): Promise<void> {
  const text = body.value.trim()
  if (!text || submitting.value) return
  submitting.value = true
  localError.value = ''
  const ok = await addComment(props.itemId, text)
  submitting.value = false
  if (ok) {
    body.value = ''
  } else {
    localError.value = '提交失败，请重试。'
  }
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}
</script>

<template>
  <div class="thread">
    <div v-if="comments.length" class="items">
      <article v-for="c in comments" :key="c.id" class="cmt">
        <span class="avatar" :class="`avatar--${c.role}`">{{ initial(c.author) }}</span>
        <div class="cmt-main">
          <div class="cmt-head">
            <span class="cmt-name">{{ c.author }}</span>
            <span class="cmt-role" :class="`cmt-role--${c.role}`">{{ ROLE_LABEL[c.role] }}</span>
            <span class="cmt-time">{{ formatDateTime(c.createdAt) }}</span>
          </div>
          <p class="cmt-body">{{ c.body }}</p>
        </div>
      </article>
    </div>

    <p v-else class="none">还没有完成情况记录。</p>

    <div class="editor">
      <div class="editor-head">
        <span class="editor-as">
          以 <b>{{ effectiveName }}</b>（{{ roleLabel }}）的身份记录
        </span>
      </div>
      <textarea
        v-model="body"
        class="field editor-input"
        rows="3"
        placeholder="写下完成情况：做了什么、怎么验证、有什么遗留问题…"
        @keydown.meta.enter="submit"
        @keydown.ctrl.enter="submit"
      />
      <div class="editor-foot">
        <span class="kbd-hint">Ctrl / ⌘ + Enter 快速提交</span>
        <button class="btn btn-primary btn-sm" :disabled="!body.trim() || submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交' }}
        </button>
      </div>
      <p v-if="localError" class="err">{{ localError }}</p>
    </div>
  </div>
</template>

<style scoped>
.thread {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.cmt {
  display: flex;
  gap: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
}

.avatar--teacher {
  background: #3b6fd4;
}

.avatar--student {
  background: #14866f;
}

.cmt-main {
  flex: 1;
  min-width: 0;
}

.cmt-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.cmt-name {
  font-weight: 600;
  font-size: 13px;
}

.cmt-role {
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 18px;
}

.cmt-role--teacher {
  background: #eaf1fd;
  color: #2b5cb8;
}

.cmt-role--student {
  background: #e6f6f1;
  color: #0f6d5b;
}

.cmt-time {
  font-size: 11.5px;
  color: var(--text-3);
}

.cmt-body {
  margin: 0;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--panel-soft);
  border: 1px solid var(--border);
  font-size: 13.5px;
  line-height: 1.68;
  white-space: pre-wrap;
  word-break: break-word;
}

.none {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-as {
  font-size: 12px;
  color: var(--text-2);
}

.editor-input {
  line-height: 1.65;
}

.editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kbd-hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.err {
  margin: 0;
  font-size: 12px;
  color: var(--danger);
}
</style>
