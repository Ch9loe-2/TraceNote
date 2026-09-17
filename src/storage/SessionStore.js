/**
 * SessionStore — IndexedDB 持久化存储
 *
 * 数据结构：
 *   Session {
 *     id: string,
 *     name: string,
 *     createdAt: ISO string,
 *     duration: number (ms),
 *     eventCount: number,
 *     page: string,
 *     events: Event[]
 *   }
 */

const DB_NAME = 'TraceNoteDB'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSession(session) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(session)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllSessions() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('createdAt')
    const request = index.openCursor(null, 'prev')
    const sessions = []
    request.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        const { events, ...meta } = cursor.value
        sessions.push({ ...meta, eventCount: (cursor.value.events || []).length })
        cursor.continue()
      } else {
        resolve(sessions)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getSession(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSession(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteAllSessions() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function createSessionData(name, events, page) {
  const duration = events.length > 0
    ? events[events.length - 1].timestamp
    : 0
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    createdAt: new Date().toISOString(),
    duration,
    eventCount: events.length,
    page: page || window.location.pathname,
    events,
  }
}