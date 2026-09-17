/**
 * Recorder — 操作录制引擎
 *
 * 监听 DOM 事件并生成结构化 Event 对象。
 * 提供 start / stop / getEvents 接口。
 */

import { createEvent } from '../models/Event.js'
import { generateSelector } from './selector.js'
import { isSensitiveField } from './sensitive.js'

export class Recorder {
  constructor() {
    this.events = []
    this.startTime = 0
    this.active = false
    this._handlers = {}
    this._currentPage = window.location.pathname
    this._lastMouseOverTarget = null
    this._mouseOverThrottleMs = 300
  }

  /**
   * 开始录制
   */
  start() {
    if (this.active) return
    this.events = []
    this.startTime = performance.now()
    this._currentPage = window.location.pathname
    this.active = true

    // 记录 page load
    this._record({ type: 'load', target: document.body })

    this._bindAll()
  }

  /**
   * 停止录制，返回事件列表
   */
  stop() {
    if (!this.active) return this.events
    this.active = false
    this._unbindAll()
    return this.events
  }

  /**
   * 获取当前事件列表
   */
  getEvents() {
    return [...this.events]
  }

  getDuration() {
    if (this.events.length === 0) return 0
    const last = this.events[this.events.length - 1]
    return last.timestamp
  }

  /**
   * 是否正在录制
   */
  isActive() {
    return this.active
  }

  _getTimestamp() {
    return Math.round(performance.now() - this.startTime)
  }

  _getPage() {
    return this._currentPage
  }

  _record(data) {
    const ts = this._getTimestamp()
    const page = this._getPage()
    const target = data.target

    let selector = ''
    let x, y

    if (target && target !== document && target !== document.body) {
      selector = generateSelector(target)
    }

    if (data.clientX !== undefined) {
      x = Math.round(data.clientX)
      y = Math.round(data.clientY)
    }

    const event = createEvent({
      type: data.type,
      timestamp: ts,
      page,
      selector,
      x,
      y,
      value: data.value,
      key: data.key,
      url: data.url,
    })

    this.events.push(event)
    return event
  }

  _bindAll() {
    const opts = { capture: true, passive: true }

    this._handlers.click = (e) => this._onClick(e)
    this._handlers.dblclick = (e) => this._onDblClick(e)
    this._handlers.mouseover = (e) => this._onMouseOver(e)
    this._handlers.keydown = (e) => this._onKeyDown(e)
    this._handlers.input = (e) => this._onInput(e)
    this._handlers.scroll = (e) => this._onScroll(e)
    this._handlers.popstate = (e) => this._onNavigation(e)
    this._handlers.hashchange = (e) => this._onNavigation(e)

    document.addEventListener('click', this._handlers.click, opts)
    document.addEventListener('dblclick', this._handlers.dblclick, opts)
    document.addEventListener('mouseover', this._handlers.mouseover, opts)
    document.addEventListener('keydown', this._handlers.keydown, opts)
    document.addEventListener('input', this._handlers.input, opts)
    window.addEventListener('scroll', this._handlers.scroll, opts)
    window.addEventListener('popstate', this._handlers.popstate)
    window.addEventListener('hashchange', this._handlers.hashchange)

    // 监听 pushState / replaceState
    this._origPushState = history.pushState
    this._origReplaceState = history.replaceState
    history.pushState = (...args) => {
      this._origPushState.apply(history, args)
      this._onNavigation()
    }
    history.replaceState = (...args) => {
      this._origReplaceState.apply(history, args)
      this._onNavigation()
    }
  }

  _unbindAll() {
    for (const [type, handler] of Object.entries(this._handlers)) {
      if (type === 'popstate' || type === 'hashchange') {
        window.removeEventListener(type, handler)
      } else if (type === 'scroll') {
        window.removeEventListener(type, handler, { capture: true, passive: true })
      } else {
        document.removeEventListener(type, handler, { capture: true, passive: true })
      }
    }

    if (this._origPushState) {
      history.pushState = this._origPushState
      this._origPushState = null
    }
    if (this._origReplaceState) {
      history.replaceState = this._origReplaceState
      this._origReplaceState = null
    }

    this._handlers = {}
  }

  _onClick(e) {
    this._record({ type: 'click', target: e.target, clientX: e.clientX, clientY: e.clientY })
  }

  _onDblClick(e) {
    this._record({ type: 'dblclick', target: e.target, clientX: e.clientX, clientY: e.clientY })
  }

  _onMouseOver(e) {
    // Throttle: only record when hovering a new target, at most once per 300ms
    if (e.target === this._lastMouseOverTarget) return
    this._lastMouseOverTarget = e.target
    this._record({ type: 'mouseover', target: e.target })
    setTimeout(() => { this._lastMouseOverTarget = null }, this._mouseOverThrottleMs)
  }

  _onKeyDown(e) {
    this._record({ type: 'keydown', target: e.target, key: e.key })
  }

  _onInput(e) {
    const el = e.target
    const value = isSensitiveField(el) ? '[REDACTED]' : el.value
    // 如果上一个事件也是 input 且操作同一个元素，替换它而不是追加
    const last = this.events[this.events.length - 1]
    if (last && last.type === 'input' && last.selector === generateSelector(el)) {
      last.value = value
      last.timestamp = this._getTimestamp()
      return
    }
    this._record({ type: 'input', target: el, value })
  }

  _onScroll(e) {
    this._record({
      type: 'scroll',
      target: document.body,
      clientX: window.scrollX,
      clientY: window.scrollY,
    })
  }

  _onNavigation(e) {
    this._currentPage = window.location.pathname + window.location.search + window.location.hash
    this._record({
      type: 'navigation',
      target: document.body,
      url: this._currentPage,
    })
  }
}