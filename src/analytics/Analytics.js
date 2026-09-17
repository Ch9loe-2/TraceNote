/**
 * Analytics — 操作分析引擎
 */

export function analyzeSession(session) {
  const events = session.events || []
  if (events.length === 0) {
    return {
      totalEvents: 0,
      counts: {},
      duration: 0,
      longestPause: 0,
      longestPauseBetween: {},
      averageInterval: 0,
      intervals: [],
    }
  }

  const counts = {}
  const intervals = []

  for (let i = 0; i < events.length; i++) {
    const type = events[i].type
    counts[type] = (counts[type] || 0) + 1

    if (i > 0) {
      intervals.push(events[i].timestamp - events[i - 1].timestamp)
    }
  }

  const duration = events[events.length - 1].timestamp
  const avgInterval = intervals.length > 0
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 0

  let longestPause = 0
  let longestPauseIdx = -1
  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i] > longestPause) {
      longestPause = intervals[i]
      longestPauseIdx = i
    }
  }

  const longestPauseBetween = longestPauseIdx >= 0
    ? {
        from: events[longestPauseIdx],
        to: events[longestPauseIdx + 1],
      }
    : {}

  return {
    totalEvents: events.length,
    counts: {
      click: counts.click || 0,
      dblclick: counts.dblclick || 0,
      input: counts.input || 0,
      scroll: counts.scroll || 0,
      navigation: counts.navigation || 0,
      keydown: counts.keydown || 0,
      mouseover: counts.mouseover || 0,
      load: counts.load || 0,
    },
    duration,
    longestPause,
    longestPauseBetween,
    averageInterval: avgInterval,
    intervals,
  }
}

/**
 * 生成时间轴 SVG 数据
 */
export function generateTimelineData(events, width = 600) {
  if (events.length === 0) return []

  const duration = events[events.length - 1].timestamp
  if (duration === 0) return events.map((e, i) => ({ ...e, x: (i / events.length) * width, labelX: 0 }))

  const padding = 30
  const availableWidth = width - padding * 2

  return events.map(e => {
    const x = padding + (e.timestamp / duration) * availableWidth
    return { ...e, x, labelX: x }
  })
}

/**
 * 格式化时间
 */
export function formatTime(ms) {
  if (typeof ms !== 'number') return '00:00.000'
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toFixed(3)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(6, '0')}`
}