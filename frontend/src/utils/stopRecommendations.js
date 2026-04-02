/**
 * Time-based stop recommendation copy for the trip planner UI.
 * Category is derived from preferredTime (if set) or parsed bestDepartureTime.
 */

/** @typedef {'breakfast'|'lunch'|'snacks'|'dinner'|'latenight'} StopCategory */

/**
 * Parse hour 0–23 from strings like "08:00 AM" / "02:00 PM".
 * @param {string|null|undefined} bestDepartureTime
 * @returns {number|null}
 */
export function parseHourFromDepartureTime(bestDepartureTime) {
  if (!bestDepartureTime || typeof bestDepartureTime !== 'string') return null
  const s = bestDepartureTime.trim()
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const mer = m[3].toUpperCase()
  if (mer === 'PM' && h !== 12) h += 12
  if (mer === 'AM' && h === 12) h = 0
  return h
}

/**
 * Map clock hour to stop category when no preferredTime is available.
 * @param {number|null} hour
 * @returns {StopCategory|null}
 */
export function hourToStopCategory(hour) {
  if (hour == null || Number.isNaN(hour)) return null
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 19) return 'snacks'
  if (hour >= 19 && hour < 24) return 'dinner'
  return 'latenight'
}

/**
 * @param {string|null|undefined} preferredTime
 * @returns {StopCategory|null}
 */
export function preferredTimeToCategory(preferredTime) {
  if (!preferredTime || typeof preferredTime !== 'string') return null
  const k = preferredTime.replace(/_/g, '').toLowerCase().replace(/\s+/g, '')
  switch (k) {
    case 'midnight':
      return 'latenight'
    case 'earlymorning':
    case 'morning':
      return 'breakfast'
    case 'afternoon':
      return 'lunch'
    case 'evening':
      return 'snacks'
    case 'night':
      return 'dinner'
    default:
      return null
  }
}

const CATEGORY_COPY = {
  breakfast: {
    headline: 'Breakfast stops recommended',
    sentence: 'Based on your departure time, we recommend breakfast stops along your route.',
    icons: ['🍛', '☕', '⛽'],
  },
  lunch: {
    headline: 'Lunch stops recommended',
    sentence: 'Based on your departure time, we recommend lunch stops along your route.',
    icons: ['🍛', '☕', '⛽'],
  },
  snacks: {
    headline: 'Snacks & tea stops recommended',
    sentence: 'Based on your departure time, we recommend snacks and tea stops along your route.',
    icons: ['☕', '🍛', '⛽'],
  },
  dinner: {
    headline: 'Dinner stops recommended',
    sentence: 'Based on your departure time, we recommend dinner stops along your route.',
    icons: ['🍛', '☕', '⛽'],
  },
  latenight: {
    headline: 'Fuel & rest stops recommended',
    sentence: 'Based on your departure time, we recommend fuel and rest stops along your route.',
    icons: ['⛽', '☕', '🍛'],
  },
}

/**
 * @param {{ preferredTime?: string|null, bestDepartureTime?: string|null }} input
 * @returns {{ category: StopCategory, headline: string, sentence: string, icons: string[] } | null}
 */
export function getStopRecommendation(input) {
  const { preferredTime, bestDepartureTime } = input || {}
  let category = preferredTimeToCategory(preferredTime)
  if (!category) {
    const hour = parseHourFromDepartureTime(bestDepartureTime)
    category = hourToStopCategory(hour)
  }
  if (!category) return null
  const copy = CATEGORY_COPY[category]
  return { category, ...copy }
}
