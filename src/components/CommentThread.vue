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
      <article v-for="c in comments" :key="c.id" class="cmt" :class="`cmt--${c.role}`">
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

    <p v-else class="none">还没有完成情况记录，学生做完后在这里说明。</p>

    <div class="editor">
      <div class="editor-head">
        <span class="editor-as">
          以 <b>{{ effectiveName }}</b> 的身份记录
        </span>
        <span class="cmt-role" :class="`cmt-role--${currentRole}`">{{ roleLabel }}</span>
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
        <span class="kbd-hint">
          <span class="kbd">⌘</span>
          <span class="kbd">Enter</span>
          快速提交
        </span>
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
  gap: 16px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cmt {
  display: flex;
  gap: 10px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: none;
  border-radius: 50%;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.12);
}

.avatar--teacher {
  background: linear-gradient(160deg, #5b8ce8, var(--teacher));
}

.avatar--student {
  background: linear-gradient(160deg, #2aab8e, var(--student));
}

.cmt-main {
  flex: 1;
  min-width: 0;
}

.cmt-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.cmt-name {
  font-weight: 600;
  font-size: 13px;
}

.cmt-role {
  height: 19px;
  padding: 0 7px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 19px;
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
  padding: 10px 13px;
  border-radius: 4px 11px 11px 11px;
  background: var(--panel-inset);
  border: 1px solid var(--border);
  font-size: 13.5px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.cmt--student .cmt-body {
  background: #f4fbf8;
  border-color: #dcefe8;
}

.none {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--panel-soft);
}

.editor-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-2);
}

.editor-as b {
  color: var(--text);
}

.editor-input {
  background: #fff;
}

.editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kbd-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--text-3);
}
</style>
