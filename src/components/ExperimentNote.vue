<template>
  <div class="note-section">
    <button class="note-toggle" @click="expanded = !expanded">
      📝 实验笔记
      <span class="note-badge" v-if="noteContent.trim()">{{ noteContent.trim().length }}</span>
      <span class="note-chevron">{{ expanded ? '▾' : '▸' }}</span>
    </button>
    <Transition name="note-expand">
      <div v-if="expanded" class="note-body">
        <textarea
          ref="textareaRef"
          v-model="noteContent"
          class="note-textarea"
          placeholder="记录你的实验心得、计算过程、踩坑经验…&#10;&#10;例如：R=220Ω时LED正常，换成47Ω直接烧了，I=V/R=5/47=106mA远超20mA额定值"
          @input="saveNote"
          rows="4"
        ></textarea>
        <div class="note-footer">
          <span class="note-status" :class="{ 'note-saved': justSaved }">
            {{ justSaved ? '✅ 已保存' : '💾 自动保存到本地' }}
          </span>
          <button v-if="noteContent.trim()" class="note-clear" @click="clearNote">🗑️ 清空</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  experimentId: String
})

const STORAGE_PREFIX = 'hw-lab-note-'
const expanded = ref(false)
const noteContent = ref('')
const justSaved = ref(false)
const textareaRef = ref(null)
let saveTimer = null

watch(() => props.experimentId, (newId) => {
  if (newId) loadNote(newId)
})

onMounted(() => {
  if (props.experimentId) loadNote(props.experimentId)
})

function loadNote(id) {
  try {
    noteContent.value = localStorage.getItem(STORAGE_PREFIX + id) || ''
  } catch (e) {
    noteContent.value = ''
  }
}

function saveNote() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + props.experimentId, noteContent.value)
      justSaved.value = true
      setTimeout(() => { justSaved.value = false }, 1500)
    } catch (e) {
      console.warn('Failed to save note:', e)
    }
  }, 500)
}

function clearNote() {
  if (!confirm('确定清空笔记吗？')) return
  noteContent.value = ''
  try {
    localStorage.removeItem(STORAGE_PREFIX + props.experimentId)
  } catch (e) {}
}
</script>

<style scoped>
.note-section {
  margin-top: 4px;
}
.note-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.note-toggle:hover {
  border-color: var(--primary);
}
.note-badge {
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
}
.note-chevron {
  margin-left: auto;
  color: var(--text-dim);
  font-size: 12px;
}
.note-body {
  margin-top: 8px;
}
.note-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-family: -apple-system, monospace;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.note-textarea:focus {
  border-color: var(--primary);
}
.note-textarea::placeholder {
  color: var(--text-dim);
  opacity: 0.5;
}
.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.note-status {
  font-size: 11px;
  color: var(--text-dim);
}
.note-saved {
  color: var(--success);
}
.note-clear {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
}
.note-clear:hover {
  text-decoration: underline;
}
.note-expand-enter-active, .note-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.note-expand-enter-from, .note-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
