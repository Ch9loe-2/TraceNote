<template>
  <div class="content-wrapper">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="toolbar-title">Session Manager</span>
      <div class="toolbar-spacer"></div>
      <div v-if="recording" class="recording-indicator">
        <span class="recording-dot"></span>
        REC {{ formatTime(currentDuration) }}
      </div>
      <button v-if="!recording" class="btn btn-primary" @click="startRecording">
        ● Start Recording
      </button>
      <button v-else class="btn btn-danger" @click="stopRecording">
        ■ Stop Recording
      </button>
    </div>

    <!-- Demo Area (visible when recording) -->
    <div v-if="recording" class="demo-area">
      <div class="demo-header">
        <span>Test Area — Interact here to generate events</span>
        <span class="demo-events">{{ events.length }} events recorded</span>
      </div>
      <div class="demo-body">
        <div class="demo-controls">
          <button class="demo-btn" @click="demoClick">Primary</button>
          <button class="demo-btn demo-btn-success" @click="demoClick">Success</button>
          <button class="demo-btn demo-btn-danger" @click="demoClick">Danger</button>
          <button class="demo-btn" @click="demoClick">Double Click Me</button>
          <input class="demo-input" type="text" placeholder="Normal text input" />
          <input class="demo-input" type="password" placeholder="Password (redacted)" />
          <input class="demo-input" type="text" placeholder="Search..." />
          <select class="demo-select">
            <option>Option 1</option><option>Option 2</option><option>Option 3</option>
          </select>
          <div class="demo-scroll">
            <div v-for="n in 20" :key="n" class="scroll-item">Item {{ n }}</div>
          </div>
        </div>
        <div class="demo-feed">
          <div class="feed-title">Live Event Feed</div>
          <div class="feed-list">
            <div v-for="evt in events" :key="evt.id" class="feed-item">
              <span class="feed-time">{{ formatTime(evt.timestamp) }}</span>
              <span class="feed-type" :class="evt.type">{{ evt.type }}</span>
              <span class="feed-selector">{{ evt.selector || evt.url || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Save Session Dialog -->
      <div v-if="showSaveDialog" class="modal-overlay" @click.self="showSaveDialog = false">
        <div class="modal-content">
          <div class="modal-title">Save Session</div>
          <div class="form-group">
            <label class="form-label">Session Name</label>
            <input class="form-input" v-model="sessionName" placeholder="e.g. Login Test" @keyup.enter="saveSession" />
          </div>
          <div class="form-group">
            <label class="form-label">Events</label>
            <div style="font-size:12px;color:var(--text-secondary)">
              {{ events.length }} events | Duration: {{ formatTime(currentDuration) }}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="discardSession">Discard</button>
            <button class="btn btn-primary" @click="saveSession">Save</button>
          </div>
        </div>
      </div>

      <!-- Session List -->
      <div class="section-title">Saved Sessions</div>
      <div v-if="sessions.length === 0" class="empty-state">
        <div class="empty-state-icon">◉</div>
        <div class="empty-state-text">No sessions recorded yet</div>
        <button class="btn btn-primary" @click="startRecording">Start Recording</button>
      </div>
      <div v-else class="session-list">
        <div v-for="session in sessions" :key="session.id" class="session-card">
          <div class="session-card-header">
            <div class="session-name">{{ session.name || 'Unnamed Session' }}</div>
            <div class="session-time">{{ formatDate(session.createdAt) }}</div>
          </div>
          <div class="session-stats">
            <span class="session-stat">▸ {{ session.eventCount || 0 }} events</span>
            <span class="session-stat">◷ {{ formatTime(session.duration) }}</span>
            <span class="session-stat">◎ {{ session.page || '/' }}</span>
          </div>
          <div class="session-actions">
            <router-link :to="`/timeline/${session.id}`" class="btn btn-sm">Timeline</router-link>
            <router-link :to="`/analytics/${session.id}`" class="btn btn-sm">Analyze</router-link>
            <button class="btn btn-sm" @click="replaySession(session)">▶ Replay</button>
            <button class="btn btn-sm btn-danger" @click="deleteSession(session.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Replay Warning Log -->
    <div v-if="replayWarnings.length > 0" class="warning-log" style="margin:0 16px 8px">
      <div v-for="(w, i) in replayWarnings" :key="i" class="warning-log-item">⚠ {{ w }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Recorder } from '../recorder/Recorder.js'
import { ReplayEngine } from '../replay/ReplayEngine.js'
import { getAllSessions, saveSession as storeSaveSession, getSession, createSessionData, deleteSession as storeDeleteSession } from '../storage/SessionStore.js'

const recorder = new Recorder()
const replayEngine = new ReplayEngine()

const recording = ref(false)
const events = ref([])
const currentDuration = ref(0)
const showSaveDialog = ref(false)
const sessionName = ref('')
const sessions = ref([])
const replayWarnings = ref([])

let durationTimer = null

onMounted(async () => {
  sessions.value = await getAllSessions()
})

function startRecording() {
  events.value = []
  replayWarnings.value = []
  currentDuration.value = 0
  recorder.start()
  recording.value = true
  durationTimer = setInterval(() => {
    currentDuration.value = recorder.getDuration()
  }, 100)
}

function stopRecording() {
  const recorded = recorder.stop()
  events.value = recorded
  recording.value = false
  clearInterval(durationTimer)
  showSaveDialog.value = true
}

function saveSession() {
  const name = sessionName.value.trim() || 'Unnamed Session'
  const data = createSessionData(name, events.value, window.location.pathname)
  storeSaveSession(data).then(() => {
    showSaveDialog.value = false
    sessionName.value = ''
    events.value = []
    getAllSessions().then(s => { sessions.value = s })
  })
}

function discardSession() {
  showSaveDialog.value = false
  events.value = []
}

async function replaySession(session) {
  const full = await getSession(session.id)
  if (!full || !full.events || full.events.length === 0) return
  replayWarnings.value = []
  replayEngine.onWarning(msg => { replayWarnings.value.push(msg) })
  if (replayEngine.isRunning()) {
    replayEngine.abort()
    await new Promise(r => setTimeout(r, 100))
  }
  replayEngine.replay(full.events)
}

function deleteSession(id) {
  storeDeleteSession(id).then(() => {
    getAllSessions().then(s => { sessions.value = s })
  })
}

function formatTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) return '00:00.000'
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const secs = (totalSeconds % 60).toFixed(3)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(6, '0')}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function demoClick() {}
</script>

<style scoped>
.content-wrapper { display: flex; flex-direction: column; height: 100%; }
.section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 600; margin-bottom: 10px; }

.demo-area { border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); flex-shrink: 0; }
.demo-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); }
.demo-events { font-family: var(--font-mono); color: var(--accent); }
.demo-body { display: flex; gap: 12px; padding: 12px 16px; max-height: 240px; }
.demo-controls { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; align-content: flex-start; flex: 1; }
.demo-btn { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; cursor: pointer; }
.demo-btn:hover { background: var(--bg-hover); }
.demo-btn-success { border-color: var(--success); color: var(--success); }
.demo-btn-danger { border-color: var(--danger); color: var(--danger); }
.demo-input { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; width: 160px; outline: none; }
.demo-input:focus { border-color: var(--accent); }
.demo-select { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; }
.demo-scroll { width: 100%; height: 100px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); padding: 4px; }
.scroll-item { padding: 4px 8px; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); }
.demo-feed { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; }
.feed-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }
.feed-list { flex: 1; overflow-y: auto; font-family: var(--font-mono); font-size: 10px; }
.feed-item { display: flex; gap: 4px; padding: 2px 4px; border-bottom: 1px solid var(--border-color); }
.feed-time { color: var(--text-muted); width: 60px; flex-shrink: 0; }
.feed-type { width: 50px; flex-shrink: 0; font-weight: 600; }
.feed-type.click { color: var(--event-click); }
.feed-type.input { color: var(--event-input); }
.feed-type.scroll { color: var(--event-scroll); }
.feed-type.navigation { color: var(--event-navigation); }
.feed-type.keydown { color: var(--event-keydown); }
.feed-selector { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>