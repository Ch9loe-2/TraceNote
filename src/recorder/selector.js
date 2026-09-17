/**
 * Selector Generator — 生成稳定的 CSS Selector
 *
 * 策略优先级:
 *   1. id
 *   2. 唯一 data-* 属性（data-testid, data-cy, data-tn）
 *   3. 唯一 class 组合
 *   4. DOM 层级路径 (nth-of-type)
 *   5. 坐标（fallback）
 */

function getSelectorByNthPath(el) {
  const parts = []
  let current = el
  while (current && current !== document.body && current !== document.documentElement) {
    const parent = current.parentElement
    if (!parent) break

    const tag = current.tagName.toLowerCase()
    const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1
      parts.unshift(`${tag}:nth-of-type(${index})`)
    } else {
      parts.unshift(tag)
    }
    current = parent
  }
  return parts.join(' > ')
}

function hasUniqueSelector(el, selector) {
  if (!selector) return false
  try {
    return document.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

export function generateSelector(el) {
  if (!el || el === document || el === document.body) return 'body'
  if (el === document.documentElement) return 'html'

  // 1. id
  if (el.id) {
    const sel = `#${CSS.escape(el.id)}`
    if (hasUniqueSelector(el, sel)) return sel
  }

  // 2. data-* 属性
  const dataAttrs = ['data-testid', 'data-cy', 'data-tn', 'data-name']
  for (const attr of dataAttrs) {
    const val = el.getAttribute(attr)
    if (val) {
      const sel = `[${attr}="${val}"]`
      if (hasUniqueSelector(el, sel)) return sel
    }
  }

  // 3. 唯一 class 组合
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(Boolean)
    if (classes.length > 0 && classes.length <= 4) {
      const sel = el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.')
      if (hasUniqueSelector(el, sel)) return sel
    }
  }

  // 4. DOM 层级路径
  const pathSel = getSelectorByNthPath(el)
  if (hasUniqueSelector(el, pathSel)) return pathSel

  // 5. 带 tag 的 class fallback
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(Boolean)
    if (classes.length > 0) {
      return el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.')
    }
  }

  return el.tagName.toLowerCase()
}