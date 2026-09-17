<template>
  <div class="content-wrapper">
    <div class="toolbar">
      <span class="toolbar-title">Analytics</span>
      <div class="toolbar-spacer"></div>
      <select class="toolbar-select" v-model="selectedSessionId" @change="onSessionChange">
        <option value="">— Select a Session —</option>
        <option v-for="s in sessions" :key="s.id" :value="s.id">
          {{ s.name || 'Unnamed' }} ({{ s.eventCount }} events)
        </option>
      </select>
    </div>

    <div class="content-area">
      <div v-if="!selectedSessionId" class="empty-state">
        <div class="empty-state-icon">◎</div>
        <div class="empty-state-text">Select a session above to analyze</div>
      </div>

      <template v-if="session">
        <!-- Summary Cards -->
        <div class="analytics-grid">
          <div class="analytics-card">
            <div class="count" style="color:var(--text-primary)">{{ analysis.totalEvents }}</div>
            <div class="label">Total Events</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-click)">{{ analysis.counts.click }}</div>
            <div class="label">Clicks</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-input)">{{ analysis.counts.input }}</div>
            <div class="label">Inputs</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-scroll)">{{ analysis.counts.scroll }}</div>
            <div class="label">Scrolls</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-navigation)">{{ analysis.counts.navigation }}</div>
            <div class="label">Navigations</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-keydown)">{{ analysis.counts.keydown }}</div>
            <div class="label">Key Down</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--warning)">{{ formatTime(analysis.duration) }}</div>
            <div class="label">Duration</div>
          </div>
          <div class="analytics-card">
            <div class="count" style="color:var(--event-mouseover)">{{ analysis.averageInterval }}ms</div>
            <div class="label">Avg Interval</div>
          </div>
        </div>

        <!-- Longest Pause -->
        <div class="analytics-section">
          <div class="section-title">Operation Analysis</div>
          <div class="analytics-card long-pause" v-if="analysis.longestPause > 0">
            <div class="pause-header">Longest Pause: {{ formatTime(analysis.longestPause) }}</div>
            <div class="pause-between" v-if="analysis.longestPauseBetween.from && analysis.longestPauseBetween.to">
              <div class="pause-event">
                <span class="pause-label">From:</span>
                <span class="pause-type" :class="analysis.longestPauseBetween.from.type">{{ analysis.longestPauseBetween.from.type }}</span>
                <span class="pause-selector">{{ analysis.longestPauseBetween.from.selector || analysis.longestPauseBetween.from.url }}</span>
              </div>
              <div class="pause-arrow">↓</div>
              <div class="pause-event">
                <span class="pause-label">To:</span>
                <span class="pause-type" :class="analysis.longestPauseBetween.to.type">{{ analysis.longestPauseBetween.to.type }}</span>
                <span class="pause-selector">{{ analysis.longestPauseBetween.to.selector || analysis.longestPauseBetween.to.url }}</span>
              </div>
            </div>
          </div>
          <div class="analytics-card" v-else>
            <div style="color:var(--text-muted);font-size:12px">Not enough events to analyze pauses</div>
          </div>
        </div>

        <!-- Event Breakdown -->
        <div class="analytics-section">
          <div class="section-title">Event Breakdown</div>
          <div class="breakdown-bar">
            <div v-for="item in breakdown" :key="item.type"
              :style="{ flex: item.percent, background: item.color, minWidth: '2px' }"
              :title="`${item.label}: ${item.count} (${item.percent.toFixed(1)}%)`"
              class="breakdown-segment"></div>
          </div>
          <div class="breakdown-legend">
            <span v-for="item in breakdown" :key="item.type" class="legend-item">
              <span class="legend-dot" :style="{ background: item.color }"></span>
              {{ item.label }} ({{ item.count }})
            </span>
          </div>
        </div>

        <!-- Interval Chart -->
        <div class="analytics-section">
          <div class="section-title">Operation Intervals (ms)</div>
          <div class="interval-chart">
            <div v-for="(interval, i) in analysis.intervals.slice(0, 50)" :key="i" class="interval-bar-wrap">
              <div class="interval-bar" :style="{ height: Math.min(interval / Math.max(analysis.longestPause, 1) * 60, 60) + 'px' }"
                :title="`Event ${i+1}: ${interval}ms`"></div>
              <div class="interval-label">{{ i + 1 }}</div>
            </div>
          </div>
          <div class="interval-note">Showing first 50 intervals</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { getAllSessions, getSession } from '../storage/SessionStore.js'
import { analyzeSession, formatTime } from '../analytics/Analytics.js'

const sessions = ref([])
const selectedSessionId = ref('')
const session = ref(null)

const analysis = computed(() => {
  if (!session.value) return { totalEvents: 0, counts: {}, duration: 0, longestPause: 0, longestPauseBetween: {}, averageInterval: 0, intervals: [] }
  return analyzeSession(session.value)
})

const breakdown = computed(() => {
  const colors = { click: '#4ec9b0', dblclick: '#4ec9b0', input: '#569cd6',
    scroll: '#ce9178', navigation: '#c586c0', keydown: '#dcdcaa', mouseover: '#6a9955', load: '#808080' }
  const labels = { click: 'Click', dblclick: 'DblClick', input: 'Input',
    scroll: 'Scroll', navigation: 'Nav', keydown: 'Key', mouseover: 'Hover', load: 'Load' }
  const total = analysis.value.totalEvents
  if (total === 0) return []
  return Object.entries(analysis.value.counts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type, count, label: labels[type] || type,
      color: colors[type] || '#808080',
      percent: (count / total) * 100,
    }))
})

onMounted(async () => {
  sessions.value = await getAllSessions()
})

watch(selectedSessionId, async (id) => {
  if (!id) { session.value = null; return }
  session.value = await getSession(id)
})

function onSessionChange() {}
</script>

<style scoped>
.content-wrapper { display: flex; flex-direction: column; height: 100%; }

.toolbar-select {
  padding: 4px 8px; font-size: 12px;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 4px; color: var(--text-primary); outline: none; min-width: 240px;
}
.toolbar-select:focus { border-color: var(--accent); }

.section-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-muted); font-weight: 600; margin-bottom: 8px;
}
.analytics-section { margin-bottom: 20px; }
.analytics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
.analytics-card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; text-align: center; }
.analytics-card .count { font-size: 28px; font-weight: 700; font-family: var(--font-mono); margin-bottom: 4px; }
.analytics-card .label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.long-pause { text-align: left; }
.pause-header { font-size: 14px; font-weight: 600; color: var(--warning); margin-bottom: 8px; }
.pause-between { padding: 8px; background: var(--bg-hover); border-radius: 4px; }
.pause-event { display: flex; gap: 6px; align-items: center; padding: 3px 0; }
.pause-label { color: var(--text-muted); font-size: 11px; width: 40px; }
.pause-type { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; }
.pause-type.click, .pause-type.dblclick { color: var(--event-click); }
.pause-type.input { color: var(--event-input); }
.pause-type.scroll { color: var(--event-scroll); }
.pause-type.navigation { color: var(--event-navigation); }
.pause-selector { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
.pause-arrow { font-size: 16px; color: var(--text-muted); padding: 2px 0; padding-left: 40px; }

.breakdown-bar { display: flex; height: 20px; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.breakdown-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--text-secondary); }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

.interval-chart { display: flex; align-items: flex-end; gap: 2px; height: 70px; padding: 4px 0; }
.interval-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; }
.interval-bar { width: 100%; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 2px; }
.interval-label { font-size: 8px; color: var(--text-muted); margin-top: 2px; }
.interval-note { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
</style>