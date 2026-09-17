/**
 * ReplayEngine — 事件回放引擎
 *
 * 按 timestamp 顺序执行事件，尽量保持原始时间间隔。
 * 如果某个事件无法回放，记录 warning 但继续。
 */

export class ReplayEngine {
  constructor() {
    this._running = false
    this._aborted = false
    this._onWarning = null
    this._onProgress = null
    this._onComplete = null
    this._onPause = null
    this._paused = false
    this._currentIndex = 0
    this._events = []
  }

  onWarning(fn) { this._onWarning = fn; return this }
  onProgress(fn) { this._onProgress = fn; return this }
  onComplete(fn) { this._onComplete = fn; return this }
  onPause(fn) { this._onPause = fn; return this }

  isRunning() { return this._running }

  abort() {
    this._aborted = true
    this._running = false
  }

  async replay(events) {
    if (this._running) return
    if (!events || events.length === 0) {
      if (this._onComplete) this._onComplete()
      return
    }

    this._aborted = false
    this._paused = false
    this._running = true
    this._currentIndex = 0
    this._events = events

    let lastTime = events[0]?.timestamp ?? 0

    for (let i = 0; i < events.length; i++) {
      if (this._aborted) break

      const event = events[i]
      if (!event || !event.type) {
        this._warn(`Invalid event at index ${i}`)
        continue
      }

      // 暂停检查（轮询式，天然可中断）
      while (this._paused && !this._aborted) {
        await this._sleepCheck(100)
      }
      if (this._aborted) break

      // 保持原始间隔（轮询方式，abort 时立即退出）
      const delay = Math.max(0, (event.timestamp ?? 0) - lastTime)
      lastTime = event.timestamp ?? 0

      if (delay > 0) {
        await this._sleepCheck(delay)
      }
      if (this._aborted) break

      // 暂停后再检查
      while (this._paused && !this._aborted) {
        await this._sleepCheck(100)
      }
      if (this._aborted) break

      this._currentIndex = i
      try {
        await this._executeEvent(event)
      } catch (err) {
        this._warn(`Failed to replay ${event.type}: ${err.message}`)
      }

      if (this._onProgress) {
        this._onProgress({ index: i, total: events.length, event })
      }
    }

    this._running = false
    if (this._onComplete && !this._aborted) {
      this._onComplete()
    }
  }

  /**
   * 轮询式 sleep：每隔一小段检查是否被 abort。
   * 解决 setTimeout + clearTimeout 在 abort 时可能永久挂起的问题。
   */
  _sleepCheck(ms) {
    return new Promise(resolve => {
      if (this._aborted) { resolve(); return }
      const deadline = Date.now() + ms
      const poll = () => {
        if (this._aborted || Date.now() >= deadline) {
          resolve()
        } else {
          setTimeout(poll, Math.min(16, deadline - Date.now()))
        }
      }
      setTimeout(poll, Math.min(16, ms))
    })
  }

  _warn(msg) {
    if (this._onWarning) this._onWarning(msg)
  }

  async _executeEvent(event) {
    switch (event.type) {
      case 'click':       this._replayClick(event); break
      case 'dblclick':    this._replayDblClick(event); break
      case 'input':       this._replayInput(event); break
      case 'scroll':      this._replayScroll(event); break
      case 'navigation':  this._replayNavigation(event); break
      case 'keydown':     this._replayKeyDown(event); break
      case 'mouseover':   this._replayMouseOver(event); break
      case 'load':        break
      default:            this._warn(`Unknown event type: ${event.type}`)
    }
  }

  _findElement(selector) {
    if (!selector) return null
    try { return document.querySelector(selector) }
    catch { return null }
  }

  _replayClick(event) {
    const el = this._findElement(event.selector)
    if (!el) {
      this._warn(`Click: element not found "${event.selector}"`)
      if (event.x != null && event.y != null) {
        const target = document.elementFromPoint(event.x, event.y)
        if (target) {
          target.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, clientX: event.x, clientY: event.y,
          }))
          return
        }
      }
      return
    }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    el.focus()
  }

  _replayDblClick(event) {
    const el = this._findElement(event.selector)
    if (!el) { this._warn(`DblClick: element not found "${event.selector}"`); return }
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
  }

  _replayMouseOver(event) {
    const el = this._findElement(event.selector)
    if (!el) return
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
  }

  _replayInput(event) {
    const el = this._findElement(event.selector)
    if (!el) { this._warn(`Input: element not found "${event.selector}"`); return }
    const val = event.value
    if (val == null || val === '[REDACTED]') return

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    if (setter) {
      setter.call(el, val)
    } else {
      el.value = val
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  _replayKeyDown(event) {
    const el = this._findElement(event.selector)
    if (!el) return
    el.dispatchEvent(new KeyboardEvent('keydown', {
      key: event.key, bubbles: true, cancelable: true,
    }))
  }

  _replayScroll(event) {
    if (event.y != null) {
      window.scrollTo({ top: event.y, behavior: 'instant' })
    }
  }

  _replayNavigation(event) {
    if (event.url) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash
      if (event.url !== currentPath) {
        if (event.url.startsWith('/')) {
          history.pushState(null, '', event.url)
        } else if (event.url.startsWith('#')) {
          window.location.hash = event.url
        }
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }
}