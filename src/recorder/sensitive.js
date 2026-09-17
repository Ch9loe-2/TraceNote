/**
 * Sensitive Field Detection — 敏感输入字段检测
 */

const SENSITIVE_ATTRS = {
  type: ['password', 'creditcard', 'cc-number', 'cc-cvc', 'cc-exp'],
  autocomplete: [
    'current-password', 'new-password', 'cc-number', 'cc-csc',
    'cc-exp', 'cc-exp-month', 'cc-exp-year'
  ],
  name: ['password', 'passwd', 'pwd', 'creditcard', 'cc-number', 'cardnumber', 'cvc', 'secret', 'token'],
  'data-sensitive': ['true'],
}

export function isSensitiveField(el) {
  if (!el || !el.tagName) return false

  const tag = el.tagName.toLowerCase()
  if (tag !== 'input' && tag !== 'textarea') return false

  for (const [attr, values] of Object.entries(SENSITIVE_ATTRS)) {
    const val = (el.getAttribute(attr) || '').toLowerCase()
    if (values.includes(val)) return true
  }

  // aria-label or placeholder containing password-like keywords
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase()
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase()
  const keywords = ['password', 'credit card', 'card number', 'cvc', 'secret', 'token', 'pin']
  for (const kw of keywords) {
    if (ariaLabel.includes(kw) || placeholder.includes(kw)) return true
  }

  return false
}