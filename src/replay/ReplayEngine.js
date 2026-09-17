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
    this._timers = []
    this._events = []
  }

  onWarning(fn) { this._onWarning = fn; return this }
  onProgress(fn) { this._onProgress = fn; return this }
  onComplete(fn) { this._onComplete = fn; return this }
  onPause(fn) { this._onPause = fn; return this }

  isRunning() { return this._running }

  abort() {
    this._aborted = true
    this._clearTimers()
    this._running = false
  }

  async replay(events) {
    if (this._running) return

    this._aborted = false
    this._paused = false
    this._running = true
    this._currentIndex = 0
    this._events = events
    this._timers = []

    const baseTime = events.length > 0 ? events[0].timestamp : 0
    let lastTime = 0

    for (let i = 0; i < events.length; i++) {
      if (this._aborted) break

      while (this._paused) {
        await this._sleep(100)
        if (this._aborted) break
      }
      if (this._aborted) break

      const event = events[i]
      const delay = event.timestamp - lastTime
      lastTime = event.timestamp

      if (delay > 0) {
        await this._sleep(delay)
      }

      if (this._aborted || this._paused) {
        i--
        continue
      }

      this._currentIndex = i
      try {
        await this._executeEvent(event)
      } catch (err) {
        this._warn(`Failed to replay ${event.type} on "${event.selector || event.url}": ${err.message}`)
      }

      if (this._onProgress) {
        this._onProgress({
          index: i,
          total: events.length,
          event,
        })
      }
    }

    this._running = false
    if (this._onComplete && !this._aborted) {
      this._onComplete()
    }
  }

  _sleep(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms)
      this._timers.push(id)
    })
  }

  _clearTimers() {
    for (const id of this._timers) {
      clearTimeout(id)
    }
    this._timers = []
  }

  _warn(msg) {
    if (this._onWarning) this._onWarning(msg)
  }

  async _executeEvent(event) {
    switch (event.type) {
      case 'click':
        this._replayClick(event)
        break
      case 'dblclick':
        this._replayDblClick(event)
        break
      case 'input':
        this._replayInput(event)
        break
      case 'scroll':
        this._replayScroll(event)
        break
      case 'navigation':
        this._replayNavigation(event)
        break
      case 'load':
        // load 事件不执行任何动作
        break
      case 'keydown':
        this._replayKeyDown(event)
        break
      case 'mouseover':
        this._replayMouseOver(event)
        break
      default:
        this._warn(`Unknown event type: ${event.type}`)
    }
  }

  _findElement(selector) {
    if (!selector) return null
    try {
      return document.querySelector(selector)
    } catch {
      return null
    }
  }

  _replayClick(event) {
    const el = this._findElement(event.selector)
    if (!el) {
      this._warn(`Click: element not found "${event.selector}"`)

      // fallback: 尝试通过坐标
      if (event.x !== undefined && event.y !== undefined) {
        const target = document.elementFromPoint(event.x, event.y)
        if (target) {
          target.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: event.x,
            clientY: event.y,
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
    if (!el) {
      this._warn(`DblClick: element not found "${event.selector}"`)
      return
    }
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
  }

  _replayMouseOver(event) {
    const el = this._findElement(event.selector)
    if (!el) {
      return // mouseover 失败不报 warning，不关键
    }
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
  }

  _replayInput(event) {
    const el = this._findElement(event.selector)
    if (!el) {
      this._warn(`Input: element not found "${event.selector}"`)
      return
    }
    const val = event.value
    if (val == null || val === '[REDACTED]') return
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, event.value)
      } else {
        el.value = event.value
      }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  _replayKeyDown(event) {
    const el = this._findElement(event.selector)
    if (!el) return
    el.dispatchEvent(new KeyboardEvent('keydown', {
      key: event.key,
      bubbles: true,
      cancelable: true,
    }))
  }

  _replayScroll(event) {
    if (event.y !== undefined) {
      window.scrollTo({ top: event.y, behavior: 'instant' })
    }
  }

  _replayNavigation(event) {
    if (event.url) {
      // 尝试作为路由导航（如果是 hash 路由或 pushState）
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