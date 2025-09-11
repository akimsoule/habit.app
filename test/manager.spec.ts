import { describe, it, expect, vi } from 'vitest'
import { Category, Habit, Priority, GoalSmart, InMemoryHabitRepository, HabitManager, NotificationService } from '../src/index'

describe('HabitManager', () => {
  const repo = new InMemoryHabitRepository()
  const notifier = new NotificationService()
  const manager = new HabitManager(repo, notifier)

  const cat = new Category('c1', 'Cat')
  manager.addCategory(cat)

  const h1 = manager.createHabit({ id: 'h1', name: 'Daily', frequency: 'daily', category: cat, priority: Priority.Medium })
  const h2 = manager.createHabit({ id: 'h2', name: 'Weekly', frequency: 'weekly', category: cat, priority: Priority.High })
  h2.setDaysOfWeek([1])
  const goal = new GoalSmart('g1', 'Goal', [h1, h2], Priority.High, 'desc', '2025-09-30')
  manager.addGoal(goal)

  it('overall progress on habits and via goals', () => {
    h1.markAsCompleted('2025-09-01')
    h2.markAsCompleted('2025-09-01')
    expect(manager.getOverallProgress('2025-09-01', '2025-09-30')).toBeGreaterThan(0)
    expect(manager.getOverallProgressFromGoals('2025-09-01')).toBeGreaterThan(0)
  })

  it('nearest due date progress returns the goal with closest deadline', () => {
    const res = manager.getNearestDueDateProgress('2025-09-01', '2025-09-10')
    expect(res).toBeTruthy()
    expect(res?.goalId).toBe('g1')
  })

  it('mutations work', () => {
    expect(manager.renameHabit('h1', 'Daily Updated')?.name).toBe('Daily Updated')
    expect(manager.setDescription('h1', 'desc')?.description).toBe('desc')
    manager.archiveHabit('h1')
    expect(repo.getHabitById('h1')?.archived).toBe(true)
    manager.unarchiveHabit('h1')
    expect(repo.getHabitById('h1')?.archived).toBe(false)
  })

  it('getOverallProgressFromGoals returns 0 when none with dueDate', () => {
    const repo = new InMemoryHabitRepository()
    const m = new HabitManager(repo, notifier)
    m.addCategory(cat)
    const h = m.createHabit({ id: 'x', name: 'Daily', frequency: 'daily', category: cat })
    const g = new GoalSmart('gx', 'No due', [h])
    m.addGoal(g)
    expect(m.getOverallProgressFromGoals('2025-09-01')).toBe(0)
  })

  it('sendReminders triggers log for all habits', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    manager.sendReminders()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
