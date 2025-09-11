import { describe, it, expect } from 'vitest'
import { InMemoryHabitRepository, HabitManager, NotificationService, GoalSmart, Category, Habit, Priority } from '../src/index'

describe('HabitManager nearest due date branches', () => {
  it('returns undefined when no goals with dueDate', () => {
    const m = new HabitManager(new InMemoryHabitRepository(), new NotificationService())
    expect(m.getNearestDueDateProgress('2025-09-01')).toBeUndefined()
  })

  it('uses fallback to closest when no future deadlines', () => {
    const repo = new InMemoryHabitRepository()
    const m = new HabitManager(repo, new NotificationService())
    const cat = new Category('c', 'C')
    m.addCategory(cat)
    const h = m.createHabit({ id: 'h', name: 'Daily', frequency: 'daily', category: cat })
    const g = new GoalSmart('g', 'Past goal', [h], Priority.Medium, undefined, '2020-01-01')
    m.addGoal(g)
    const res = m.getNearestDueDateProgress('2019-12-01', '2025-09-10')
    expect(res?.goalId).toBe('g')
  })

  it('picks nearest future deadline when multiple exist', () => {
    const repo = new InMemoryHabitRepository()
    const m = new HabitManager(repo, new NotificationService())
    const cat = new Category('c', 'C')
    m.addCategory(cat)
    const h = m.createHabit({ id: 'h', name: 'Daily', frequency: 'daily', category: cat })
    const g1 = new GoalSmart('g1', 'Soon', [h], Priority.Medium, undefined, '2025-09-20')
    const g2 = new GoalSmart('g2', 'Later', [h], Priority.Medium, undefined, '2025-10-01')
    m.addGoal(g1)
    m.addGoal(g2)
    const res = m.getNearestDueDateProgress('2025-09-01', '2025-09-10')
    expect(res?.goalId).toBe('g1')
  })
})
