import { describe, it, expect } from 'vitest'
import { Category } from '../src/domain/category'
import { Habit } from '../src/domain/habit'
import { Priority } from '../src/domain/priority'

describe('Habit notes & streaks', () => {
  const cat = new Category('c', 'Cat')

  it('completeWithNote & getCompletionNote', () => {
    const h = new Habit('h', 'Test', 'daily', cat, Priority.Medium)
    h.completeWithNote('2025-09-01', 'good job')
    expect(h.isCompletedOn('2025-09-01')).toBe(true)
    expect(h.getCompletionNote('2025-09-01')).toBe('good job')
  })

  it('getCurrentStreak and getLongestStreak', () => {
    const h = new Habit('h2', 'Streak', 'daily', cat, Priority.Medium)
    // Create a 3-day streak ending today
    const today = new Date()
    const y = today.getUTCFullYear()
    const m = today.getUTCMonth()
    const d = today.getUTCDate()
    const d0 = new Date(Date.UTC(y, m, d)).toISOString().slice(0,10)
    const d1 = new Date(Date.UTC(y, m, d-1)).toISOString().slice(0,10)
    const d2 = new Date(Date.UTC(y, m, d-2)).toISOString().slice(0,10)
    h.markAsCompleted(d2)
    h.markAsCompleted(d1)
    h.markAsCompleted(d0)
    // Add a previous isolated completion to affect longest
    const dPrev = new Date(Date.UTC(y, m, d-5)).toISOString().slice(0,10)
    h.markAsCompleted(dPrev)
    expect(h.getCurrentStreak()).toBeGreaterThanOrEqual(3)
    expect(h.getLongestStreak()).toBeGreaterThanOrEqual(3)
  })
})
