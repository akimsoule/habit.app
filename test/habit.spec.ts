import { describe, it, expect } from 'vitest'
import { Category, Habit, Priority } from '../src/index'

describe('Habit', () => {
  const cat = new Category('c1', 'Test')

  it('marks and toggles completion', () => {
    const h = new Habit('h1', 'Daily', 'daily', cat, Priority.Medium)
    expect(h.isCompletedOn('2025-09-01')).toBe(false)
    h.markAsCompleted('2025-09-01')
    expect(h.isCompletedOn('2025-09-01')).toBe(true)
    h.toggleCompleted('2025-09-01')
    expect(h.isCompletedOn('2025-09-01')).toBe(false)
  })

  it('computes daily progress', () => {
    const h = new Habit('h2', 'Daily', 'daily', cat, Priority.Low)
    h.markAsCompleted('2025-09-01')
    h.markAsCompleted('2025-09-03')
    const p = h.getProgress('2025-09-01', '2025-09-03')
    expect(p).toBeCloseTo(2 / 3)
  })

  it('weekly default on Monday and custom daysOfWeek', () => {
    const h = new Habit('h3', 'Weekly', 'weekly', cat, Priority.High)
    // default: monday only
    expect(h.isDueOn('2025-09-01')).toBe(true) // Monday
    expect(h.isDueOn('2025-09-02')).toBe(false)

    h.setDaysOfWeek([0, 2, 5]) // Sun, Tue, Fri
    expect(h.isDueOn('2025-09-02')).toBe(true) // Tue
    expect(h.isDueOn('2025-09-05')).toBe(true) // Fri
  })

  it('monthly default first day and custom dayOfMonth', () => {
    const h = new Habit('h4', 'Monthly', 'monthly', cat, Priority.Medium)
    expect(h.isDueOn('2025-09-01')).toBe(true)
    expect(h.isDueOn('2025-09-02')).toBe(false)

    h.setDayOfMonth(15)
    expect(h.isDueOn('2025-09-15')).toBe(true)
  })

  it('weekly default Monday when no daysOfWeek set', () => {
    const h = new Habit('h7', 'Weekly', 'weekly', cat, Priority.Medium)
    expect(h.isDueOn('2025-09-01')).toBe(true)
    expect(h.isDueOn('2025-09-03')).toBe(false)
  })

  it('unknown frequency falls back to false (defensive)', () => {
    const h = new Habit('h8', 'X', 'daily', cat, Priority.Medium)
    ;(h as any).frequency = 'unknown'
    expect(h.isDueOn('2025-09-01')).toBe(false)
  })

  it('archive/unarchive', () => {
    const h = new Habit('h5', 'Daily', 'daily', cat, Priority.Medium)
    expect(h.archived).toBe(false)
    h.archive()
    expect(h.archived).toBe(true)
    h.unarchive()
    expect(h.archived).toBe(false)
  })

  it('history and last completed behavior', () => {
    const h = new Habit('h6', 'Daily', 'daily', cat, Priority.Medium)
    expect(h.getLastCompleted()).toBeUndefined()
    h.markAsCompleted('2025-09-02')
    h.markAsCompleted('2025-09-01')
    expect(h.getCompletionHistory()).toEqual(['2025-09-01', '2025-09-02'])
    expect(h.getLastCompleted()).toBe('2025-09-02')
  })

  it('getProgress returns 0 when no expected occurrences in range', () => {
    const h = new Habit('h9', 'Monthly', 'monthly', cat, Priority.Medium)
    h.setDayOfMonth(31)
    const p = h.getProgress('2025-09-02', '2025-09-03')
    expect(p).toBe(0)
  })
})
