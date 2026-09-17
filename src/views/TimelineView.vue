<template>
  <div class="content-wrapper">
    <div class="toolbar">
      <span class="toolbar-title">Timeline</span>
      <div class="toolbar-spacer"></div>
      <select class="toolbar-select" v-model="selectedSessionId">
        <option value="">— Select a Session —</option>
        <option v-for="s in sessions" :key="s.id" :value="s.id">
          {{ s.name || 'Unnamed' }} ({{ s.eventCount }} events)
        </option>
      </select>
    </div>

    <div class="content-area timeline-page">
      <!-- No session selected -->
      <div v-if="!selectedSessionId" class="empty-state">
        <div class="empty-state-icon">◈</div>
        <div class="empty-state-text">Select a session above to view its timeline</div>
      </div>

      <template v-if="session">
        <!-- Session info -->
        <div class="session-info-bar">
          <span class="info-item">◷ {{ formatTime(session.duration) }}</span>
          <span class="info-item">▸ {{ session.events.length }} events</span>
          <span class="info-item">◎ {{ session.page || '/' }}</span>
          <span class="info-item">{{ formatDate(session.createdAt) }}</span>
        </div>

        <!-- Timeline Visualization -->
        <div class="timeline-svg-container" ref="svgContainer">
          <svg :width="svgWidth" :height="60" xmlns="http://www.w3.org/2000/svg">
            <line x1="30" :y1="30" :x2="svgWidth - 30" y2="30" stroke="#3c3c3c" stroke-width="2" />
            <g v-for="(pt, i) in timelinePoints" :key="i">
              <line :x1="pt.x" y1="25" :x2="pt.x" y2="35" stroke="#555" stroke-width="1.5" />
              <circle :cx="pt.x" cy="30" :r="i === selectedIndex ? 5 : 3"
                :fill="getEventColor(pt.type)" :stroke="i === selectedIndex ? '#fff' : 'none'"
                stroke-width="1.5" style="cursor:pointer"
                @click="selectEventByIndex(i)" />
              <text :x="pt.x" y="16" text-anchor="middle" font-size="9" fill="#6e6e6e"
                font-family="var(--font-mono)">
                {{ formatTime(pt.timestamp) }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Time markers -->
        <div class="timeline-markers">
          <span v-for="n in markerCount" :key="n" class="marker">
            {{ formatTime((n - 1) * markerInterval) }}
          </span>
        </div>

        <!-- Event List -->
        <div class="timeline-container">
          <div v-for="(event, idx) in sortedEvents" :key="event.id"
            class="timeline-event"
            :class="{ selected: idx === selectedIndex }"
            @click="selectEvent(idx)">
            <span class="event-time">{{ formatTime(event.timestamp) }}</span>
            <span class="event-type-badge" :class="event.type">{{ labelOf(event.type) }}</span>
            <span class="event-selector">{{ event.selector || event.url || '-' }}</span>
            <span v-if="event.value" class="event-value">{{ event.value }}</span>
          </div>
        </div>

        <!-- Event Detail -->
        <div v-if="selectedEvent" class="event-detail">
          <div class="event-detail-title">Event Detail</div>
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value" style="text-transform:uppercase">{{ selectedEvent.type }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Timestamp</span>
            <span class="detail-value">{{ (selectedEvent.timestamp / 1000).toFixed(3) }}s</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Page</span>
            <span class="detail-value">{{ selectedEvent.page || '/' }}</span>
          </div>
          <div class="detail-row" v-if="selectedEvent.selector">
            <span class="detail-label">Selector</span>
            <span class="detail-value">{{ selectedEvent.selector }}</span>
          </div>
          <div class="detail-row" v-if="selectedEvent.url">
            <span class="detail-label">URL</span>
            <span class="detail-value">{{ selectedEvent.url }}</span>
          </div>
          <div class="detail-row" v-if="selectedEvent.x !== undefined">
            <span class="detail-label">Position</span>
            <span class="detail-value">{{ selectedEvent.x }}, {{ selectedEvent.y }}</span>
          </div>
          <div class="detail-row" v-if="selectedEvent.key">
            <span class="detail-label">Key</span>
            <span class="detail-value">{{ selectedEvent.key }}</span>
          </div>
          <div class="detail-row" v-if="selectedEvent.value">
            <span class="detail-label">Value</span>
            <span class="detail-value" :class="{ redacted: selectedEvent.value === '[REDACTED]' }">{{ selectedEvent.value }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">ID</span>
            <span class="detail-value" style="font-size:10px">{{ selectedEvent.id }}</span>
          </div>
        </div>

        <!-- Replay Controls -->
        <div class="replay-bar" v-if="session.events.length > 0">
          <button class="btn" @click="replaySession">▶ Replay</button>
          <button class="btn" @click="replayFromSelected" :disabled="!selectedEvent">▶ Replay from Selected</button>
          <button class="btn btn-sm" @click="exportJSON">Export JSON</button>
        </div>

        <!-- Replay Warnings -->
        <div v-if="replayWarnings.length > 0" class="warning-log">
          <div v-for="(w, i) in replayWarnings" :key="i" class="warning-log-item">⚠ {{ w }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { getAllSessions, getSession } from '../storage/SessionStore.js'
import { ReplayEngine } from '../replay/ReplayEngine.js'
import { generateTimelineData, formatTime } from '../analytics/Analytics.js'

const sessions = ref([])
const selectedSessionId = ref('')
const session = ref(null)
const selectedIndex = ref(-1)
const selectedEvent = ref(null)
const replayWarnings = ref([])
const svgContainer = ref(null)
const svgWidth = ref(600)

const sortedEvents = computed(() => {
  if (!session.value?.events) return []
  return [...session.value.events].sort((a, b) => a.timestamp - b.timestamp)
})

const timelinePoints = computed(() => {
  if (!session.value?.events || session.value.events.length === 0) return []
  return generateTimelineData(sortedEvents.value, svgWidth.value)
})

const duration = computed(() => {
  const evts = sortedEvents.value
  return evts.length > 0 ? evts[evts.length - 1].timestamp : 0
})

const markerInterval = computed(() => {
  const d = duration.value
  if (d <= 0) return 2000
  const rough = d / 5
  const magnitudes = [100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000]
  return magnitudes.find(m => m >= rough) || 60000
})

const markerCount = computed(() => {
  const d = duration.value
  if (d <= 0) return 1
  return Math.ceil(d / markerInterval.value) + 1
})

onMounted(async () => {
  sessions.value = await getAllSessions()
})

watch(selectedSessionId, async (id) => {
  if (!id) {
    session.value = null
    selectedIndex.value = -1
    selectedEvent.value = null
    return
  }
  const full = await getSession(id)
  session.value = full
  selectedIndex.value = -1
  selectedEvent.value = null
  replayWarnings.value = []
  await nextTick()
  if (svgContainer.value) {
    svgWidth.value = svgContainer.value.clientWidth - 32
  }
})

function labelOf(type) {
  const map = { click: 'Click', dblclick: 'DblClick', input: 'Input',
    scroll: 'Scroll', navigation: 'Nav', keydown: 'Key', mouseover: 'Hover', load: 'Load' }
  return map[type] || type
}

function selectEvent(idx) {
  selectedIndex.value = idx
  selectedEvent.value = sortedEvents.value[idx]
}

function selectEventByIndex(idx) {
  selectEvent(idx)
}

function getEventColor(type) {
  const colors = { click: '#4ec9b0', dblclick: '#4ec9b0', input: '#569cd6',
    scroll: '#ce9178', navigation: '#c586c0', keydown: '#dcdcaa', mouseover: '#6a9955', load: '#808080' }
  return colors[type] || '#cccccc'
}

function exportJSON() {
  if (!session.value) return
  const data = {
    session: { id: session.value.id, name: session.value.name, createdAt: session.value.createdAt, duration: session.value.duration, page: session.value.page },
    events: session.value.events.map(e => ({ id: e.id, type: e.type, timestamp: e.timestamp, page: e.page, selector: e.selector, x: e.x, y: e.y, value: e.value, key: e.key, url: e.url })),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `tracenote-${session.value.name || 'session'}-${Date.now()}.json`
  a.click(); URL.revokeObjectURL(url)
}

function replaySession() {
  if (!session.value?.events || session.value.events.length === 0) return
  replayWarnings.value = []
  const engine = new ReplayEngine()
  engine.onWarning(msg => replayWarnings.value.push(msg))
  engine.replay(session.value.events)
}

function replayFromSelected() {
  if (!selectedEvent.value || !session.value?.events) return
  const idx = sortedEvents.value.findIndex(e => e.id === selectedEvent.value.id)
  if (idx < 0) return
  replayWarnings.value = []
  const engine = new ReplayEngine()
  engine.onWarning(msg => replayWarnings.value.push(msg))
  engine.replay(sortedEvents.value.slice(idx))
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.content-wrapper { display: flex; flex-direction: column; height: 100%; }
.timeline-page { overflow-y: auto; }

.toolbar-select {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  outline: none;
  min-width: 240px;
}
.toolbar-select:focus { border-color: var(--accent); }

.session-info-bar {
  display: flex; gap: 16px;
  padding: 6px 0;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.info-item { font-family: var(--font-mono); }

.timeline-markers {
  display: flex;
  justify-content: space-between;
  padding: 0 30px;
  margin-bottom: 12px;
}
.marker {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
}

.replay-bar {
  display: flex; gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 12px;
}

.redacted { color: var(--danger) !important; }
.timeline-svg-container svg { display: block; }
</style>