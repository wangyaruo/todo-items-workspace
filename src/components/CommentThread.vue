<script setup lang="ts">
import { computed, ref } from 'vue'
import { ROLE_LABEL } from '@/constants'
import { addComment, currentRole, deleteComment, effectiveName } from '@/store/board'
import { formatDateTime } from '@/utils/format'
import type { Comment } from '@/types'

const props = defineProps<{ itemId: string; comments: Comment[] }>()

const body = ref('')
const submitting = ref(false)
const localError = ref('')

/** 待确认删除的评论 id（点「删除」后先出确认按钮） */
const confirmingId = ref('')
const deleting = ref(false)

const roleLabel = computed(() => ROLE_LABEL[currentRole.value])

/** 只能删自己发的：署名与角色都与当前身份一致 */
function canDelete(c: Comment): boolean {
  return !c.deleted && c.author === effectiveName.value && c.role === currentRole.value
}

/** 留痕文案：谁删的显示谁 */
function deletedText(c: Comment): string {
  const who = c.deletedBy || c.author
  const role = c.deletedByRole ? ROLE_LABEL[c.deletedByRole] : ROLE_LABEL[c.role]
  return `${who}（${role}）删除了一条评论`
}

async function confirmDelete(c: Comment): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  localError.value = ''
  const ok = await deleteComment(props.itemId, c.id)
  deleting.value = false
  confirmingId.value = ''
  if (!ok) localError.value = '删除失败，请重试。'
}

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
      <article
        v-for="c in comments"
        :key="c.id"
        class="cmt"
        :class="[`cmt--${c.role}`, { 'cmt--deleted': c.deleted }]"
      >
        <span class="avatar" :class="`avatar--${c.role}`">{{ initial(c.author) }}</span>
        <div class="cmt-main">
          <div class="cmt-head">
            <span class="cmt-name">{{ c.author }}</span>
            <span class="cmt-role" :class="`cmt-role--${c.role}`">{{ ROLE_LABEL[c.role] }}</span>
            <span class="cmt-time">{{ formatDateTime(c.createdAt) }}</span>
            <template v-if="canDelete(c)">
              <button
                v-if="confirmingId !== c.id"
                class="cmt-del"
                title="删除这条评论（会留痕）"
                @click="confirmingId = c.id"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M2.6 4.2h10.8M6.4 4.2V3.1a.7.7 0 0 1 .7-.7h1.8a.7.7 0 0 1 .7.7v1.1M4.4 4.2l.5 8.4a1.2 1.2 0 0 0 1.2 1.1h3.8a1.2 1.2 0 0 0 1.2-1.1l.5-8.4M6.6 7v4M9.4 7v4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                删除
              </button>
              <span v-else class="cmt-del-confirm">
                确认删除？
                <button class="cmt-del-yes" :disabled="deleting" @click="confirmDelete(c)">
                  {{ deleting ? '删除中…' : '确认' }}
                </button>
                <button class="cmt-del-no" :disabled="deleting" @click="confirmingId = ''">取消</button>
              </span>
            </template>
          </div>
          <p v-if="c.deleted" class="cmt-body cmt-body--deleted">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M2.6 4.2h10.8M6.4 4.2V3.1a.7.7 0 0 1 .7-.7h1.8a.7.7 0 0 1 .7.7v1.1M4.4 4.2l.5 8.4a1.2 1.2 0 0 0 1.2 1.1h3.8a1.2 1.2 0 0 0 1.2-1.1l.5-8.4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ deletedText(c) }}
          </p>
          <p v-else class="cmt-body">{{ c.body }}</p>
        </div>
      </article>
    </div>

    <p v-else class="none">还没有完成情况记录，开发做完后在这里说明。</p>

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

.avatar--product {
  background: linear-gradient(160deg, #5b8ce8, var(--product));
}

.avatar--developer {
  background: linear-gradient(160deg, #2aab8e, var(--developer));
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

.cmt-role--product {
  background: #eaf1fd;
  color: #2b5cb8;
}

.cmt-role--developer {
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

.cmt--developer .cmt-body {
  background: #f4fbf8;
  border-color: #dcefe8;
}

/* ---------- 删除与留痕 ---------- */
.cmt-del {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 19px;
  padding: 0 6px;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-size: 11px;
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s var(--ease), background 0.15s var(--ease), color 0.15s var(--ease);
}

.cmt:hover .cmt-del {
  opacity: 1;
}

.cmt-del:hover {
  background: #fdf0ef;
  color: var(--danger);
}

.cmt-del-confirm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--danger);
}

.cmt-del-yes,
.cmt-del-no {
  height: 19px;
  padding: 0 7px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
}

.cmt-del-yes {
  border: 1px solid #f3c6c2;
  background: #fdf0ef;
  color: var(--danger);
  font-weight: 600;
}

.cmt-del-no {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-2);
}

/* 留痕占位：虚线灰底，示意内容已删 */
.cmt-body--deleted {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-style: dashed;
  background: transparent;
  color: var(--text-3);
  font-size: 12.5px;
  font-style: italic;
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
