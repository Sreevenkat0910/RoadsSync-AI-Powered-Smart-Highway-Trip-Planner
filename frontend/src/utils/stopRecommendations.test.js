import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getStopRecommendation,
  hourToStopCategory,
  parseHourFromDepartureTime,
  preferredTimeToCategory,
} from './stopRecommendations.js'

test('preferred afternoon maps to lunch category', () => {
  assert.equal(preferredTimeToCategory('afternoon'), 'lunch')
  const r = getStopRecommendation({ preferredTime: 'afternoon', bestDepartureTime: null })
  assert.equal(r.category, 'lunch')
  assert.match(r.sentence, /lunch stops/i)
})

test('preferred evening maps to snacks', () => {
  const r = getStopRecommendation({ preferredTime: 'evening' })
  assert.equal(r.category, 'snacks')
  assert.match(r.headline, /Snacks & tea/i)
})

test('preferred night maps to dinner', () => {
  const r = getStopRecommendation({ preferredTime: 'night' })
  assert.equal(r.category, 'dinner')
  assert.match(r.sentence, /dinner stops/i)
})

test('preferred morning maps to breakfast', () => {
  const r = getStopRecommendation({ preferredTime: 'morning' })
  assert.equal(r.category, 'breakfast')
})

test('preferred early morning maps to breakfast', () => {
  assert.equal(preferredTimeToCategory('early morning'), 'breakfast')
  const r = getStopRecommendation({ preferredTime: 'early morning' })
  assert.equal(r.category, 'breakfast')
})

test('bestDepartureTime 02:00 PM maps to lunch when no preferredTime', () => {
  const r = getStopRecommendation({ preferredTime: '', bestDepartureTime: '02:00 PM' })
  assert.equal(r.category, 'lunch')
})

test('parse hour from 08:00 AM', () => {
  assert.equal(parseHourFromDepartureTime('08:00 AM'), 8)
  assert.equal(hourToStopCategory(8), 'breakfast')
})

test('hour 21 maps to dinner', () => {
  assert.equal(hourToStopCategory(21), 'dinner')
})
