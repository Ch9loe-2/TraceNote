<template>
  <div class="content-wrapper">
    <div class="toolbar">
      <router-link to="/" class="back-link">← Back</router-link>
      <span class="toolbar-title" style="margin-left:8px">Timeline — {{ session?.name || 'Session' }}</span>
      <div class="toolbar-spacer"></div>
      <button class="btn" @click="replaySession">▶ Replay All</button>
      <button class="btn" @click="replayFromSelected" :disabled="!selectedEvent">▶ Replay from Selected</button>
      <button class="btn btn-sm" @click="exportJSON">Export JSON</button>
    </div>

    <div class="content-area timeline-page">
      <!-- Timeline Visualization -->
      <div class="timeline-svg-container" ref="svgContainer">
        <svg :width="svgWidth" :height="60" xmlns="http://www.w3.org/2000/svg">
          <!-- Timeline line -->
          <line x1="30" :y1="30" :x2="svgWidth - 30" y2="30" stroke="#3c3c3c" stroke-width="2" />
          <!-- Tick marks at events -->
          <g v-for="(pt, i) in timelinePoints" :key="i">
            <line :x1="pt.x" y1="25" :x2="pt.x" y2="35" stroke="#555" stroke-width="1.5" />
            <circle :x1="pt.x" y1="30" :cx="pt.x" cy="30" :r="i === selectedIndex ? 5 : 3"
              :fill="getEventColor(pt.type)" :stroke="i === selectedIndex ? '#fff' : 'none'"
              stroke-width="1.5"
              style="cursor:pointer" @click="selectEventByIndex(i)" />
            <!-- Event label above -->
            <text :x="pt.x" y="16" text-anchor="middle" font-size="9" fill="#6e6e6e"
              font-family="var(--font-mono)">
              {{ formatTime(pt.timestamp) }}
            </text>
          </g>
        </svg>
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

      <!-- Empty -->
      <div v-if="!session || !session.events || session.events.length === 0" class="empty-state">
        <div class="empty-state-text">No events in this session</div>
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
          <span class="detail-value">{{ formatTime(selectedEvent.timestamp) }}s</span>
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

      <!-- Replay Warnings -->
      <div v-if="replayWarnings.length > 0" class="warning-log">
        <div v-for="(w, i) in replayWarnings" :key="i" class="warning-log-item">⚠ {{ w }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '../storage/SessionStore.js'
import { ReplayEngine } from '../replay/ReplayEngine.js'
import { generateTimelineData, formatTime } from '../analytics/Analytics.js'

const route = useRoute()
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

onMounted(async () => {
  const id = route.params.id
  session.value = await getSession(id)

  if (svgContainer.value) {
    svgWidth.value = svgContainer.value.clientWidth - 32
  }
})

function labelOf(type) {
  const map = {
    click: 'Click', dblclick: 'DblClick', input: 'Input',
    scroll: 'Scroll', navigation: 'Nav', keydown: 'Key',
    mouseover: 'Hover', load: 'Load'
  }
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
  const colors = {
    click: '#4ec9b0', dblclick: '#4ec9b0', input: '#569cd6',
    scroll: '#ce9178', navigation: '#c586c0', keydown: '#dcdcaa',
    mouseover: '#6a9955', load: '#808080'
  }
  return colors[type] || '#cccccc'
}

function exportJSON() {
  if (!session.value) return
  const data = {
    session: {
      id: session.value.id,
      name: session.value.name,
      createdAt: session.value.createdAt,
      duration: session.value.duration,
      page: session.value.page,
    },
    events: session.value.events.map(e => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp,
      page: e.page,
      selector: e.selector,
      x: e.x,
      y: e.y,
      value: e.value,
      key: e.key,
      url: e.url,
    })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tracenote-${session.value.name || 'session'}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
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
</script>

<style scoped>
.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.timeline-page {
  overflow-y: auto;
}

.redacted {
  color: var(--danger) !important;
}

.timeline-svg-container svg {
  display: block;
}
</style>