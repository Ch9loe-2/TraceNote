/**
 * Event Model — 单一事件的数据结构
 */

let eventIdCounter = 0

export function createId() {
  return `evt-${Date.now()}-${++eventIdCounter}`
}

export function createEvent({ type, timestamp, page, selector, x, y, value, key, url }) {
  return {
    id: createId(),
    type,          // click | dblclick | mouseover | keydown | input | scroll | navigation | load
    timestamp,     // 从录制开始到该事件的毫秒数
    page,          // 当前页面路径
    selector,      // CSS selector
    x,             // 鼠标X坐标 (可选)
    y,             // 鼠标Y坐标 (可选)
    value,         // input的值 (敏感字段会被替换为 [REDACTED])
    key,           // 键盘按键
    url,           // navigation 目标url
  }
}

export const EVENT_TYPES = [
  'click',
  'dblclick',
  'mouseover',
  'keydown',
  'input',
  'scroll',
  'navigation',
  'load',
]

export const EVENT_TYPE_LABELS = {
  click: 'Click',
  dblclick: 'DblClick',
  mouseover: 'Hover',
  keydown: 'KeyDown',
  input: 'Input',
  scroll: 'Scroll',
  navigation: 'Navigation',
  load: 'Page Load',
}