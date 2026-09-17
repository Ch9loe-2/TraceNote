<template>
  <div class="content-wrapper">
    <div class="toolbar">
      <span class="toolbar-title">Settings</span>
    </div>

    <div class="content-area">
      <div class="settings-section">
        <div class="section-title">General</div>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Sensitive Field Detection</div>
              <div class="setting-desc">Automatically redact password, credit card, and token fields during recording.</div>
            </div>
            <div class="setting-value">
              <span class="badge badge-active">ENABLED</span>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Selector Priority</div>
              <div class="setting-desc">id → data-* → class → DOM path → coordinates</div>
            </div>
            <div class="setting-value">
              <span class="badge">5-LEVEL</span>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Storage Engine</div>
              <div class="setting-desc">Sessions are persisted in IndexedDB.</div>
            </div>
            <div class="setting-value">
              <span class="badge">IndexedDB</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">Data Management</div>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Clear All Sessions</div>
              <div class="setting-desc">Delete all saved sessions from IndexedDB. This cannot be undone.</div>
            </div>
            <div class="setting-value">
              <button class="btn btn-danger btn-sm" @click="confirmClear">Clear All</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Export All Sessions</div>
              <div class="setting-desc">Download all sessions as a single JSON file.</div>
            </div>
            <div class="setting-value">
              <button class="btn btn-sm" @click="exportAll">Export</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">About</div>
        <div class="settings-card">
          <div class="about-info">
            <div class="about-name">TraceNote</div>
            <div class="about-version">v1.0.0</div>
            <div class="about-desc">Web User Operation Recorder &amp; Replay Analysis Tool</div>
            <div class="about-tech">Vue 3 · Vite · IndexedDB · DOM API</div>
          </div>
        </div>
      </div>

      <!-- Clear confirmation modal -->
      <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
        <div class="modal-content">
          <div class="modal-title">Clear All Sessions</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
            This will permanently delete all saved sessions and events. This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="btn" @click="showClearConfirm = false">Cancel</button>
            <button class="btn btn-danger" @click="clearAll">Delete All</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getAllSessions, deleteAllSessions, getSession } from '../storage/SessionStore.js'

const showClearConfirm = ref(false)

function confirmClear() {
  showClearConfirm.value = true
}

async function clearAll() {
  await deleteAllSessions()
  showClearConfirm.value = false
}

async function exportAll() {
  const sessions = await getAllSessions()
  if (sessions.length === 0) return

  const exportData = []
  for (const s of sessions) {
    const full = await getSession(s.id)
    if (full) {
      exportData.push({
        session: { id: full.id, name: full.name, createdAt: full.createdAt, duration: full.duration, page: full.page },
        events: full.events.map(e => ({
          id: e.id, type: e.type, timestamp: e.timestamp, page: e.page,
          selector: e.selector, x: e.x, y: e.y, value: e.value, key: e.key, url: e.url,
        })),
      })
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `tracenote-all-sessions-${Date.now()}.json`
  a.click(); URL.revokeObjectURL(url)
}
</script>

<style scoped>
.content-wrapper { display: flex; flex-direction: column; height: 100%; }

.section-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-muted); font-weight: 600; margin-bottom: 8px;
}
.settings-section { margin-bottom: 20px; }

.settings-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}
.setting-row:last-child { border-bottom: none; }

.setting-info { flex: 1; }
.setting-label { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
.setting-desc { font-size: 11px; color: var(--text-muted); }

.badge {
  font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 4px;
  background: var(--bg-hover); color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.badge-active {
  background: rgba(78, 201, 176, 0.15);
  color: var(--success);
}

.about-info { padding: 14px; text-align: center; }
.about-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.about-version { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
.about-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.about-tech { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
</style>