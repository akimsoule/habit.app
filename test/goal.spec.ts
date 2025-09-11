import { describe, it, expect } from 'vitest'
import { Category, Habit, Priority, GoalSmart } from '../src/index'

describe('GoalSmart', () => {
  const cat = new Category('c1', 'Cat')
  const h1 = new Habit('h1', 'Daily', 'daily', cat, Priority.Medium)
  const h2 = new Habit('h2', 'Weekly', 'weekly', cat, Priority.Medium)
  h2.setDaysOfWeek([1])

  it('calculates progress using dueDate by default', () => {
    const goal = new GoalSmart('g1', 'Test', [h1, h2], Priority.High, 'desc', '2025-09-10')
    h1.markAsCompleted('2025-09-01')
    h2.markAsCompleted('2025-09-01')
    const p = goal.getProgress('2025-09-01')
    expect(p).toBeGreaterThan(0)
  })

  it('can remove habit and progress adapts', () => {
    const goal = new GoalSmart('g2', 'Test2', [h1, h2], Priority.Medium, undefined, '2025-09-30')
    const p1 = goal.getProgress('2025-09-01')
    goal.removeHabit('h2')
    const p2 = goal.getProgress('2025-09-01')
    // With fewer habits, progress recalculates
    expect(p2).not.toEqual(p1)
  })

  it('returns 0 when no dueDate and no endDate provided', () => {
    const g = new GoalSmart('g3', 'NoDue', [h1], Priority.Low)
    const p = g.getProgress('2025-09-01')
    expect(p).toBe(0)
  })

  it('returns 0 when no habits', () => {
    const g = new GoalSmart('g4', 'Empty', [], Priority.Low, undefined, '2025-09-30')
    const p = g.getProgress('2025-09-01')
    expect(p).toBe(0)
  })

  it('uses explicit endDate when provided (overrides dueDate)', () => {
    const g = new GoalSmart('g5', 'Override', [h1], Priority.Low, undefined, '2025-10-31')
    h1.markAsCompleted('2025-09-01')
    const p = g.getProgress('2025-09-01', '2025-09-01')
    expect(p).toBe(1)
  })

  it('addHabit and getHabits work', () => {
    const c = new Category('c2', 'C2')
    const h = new Habit('hx', 'Daily', 'daily', c, Priority.Medium)
    const g = new GoalSmart('g6', 'Add', [], Priority.Medium)
    g.addHabit(h)
    expect(g.getHabits().map(x => x.id)).toEqual(['hx'])
  })
})
