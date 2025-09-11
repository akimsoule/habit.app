import { describe, it, expect } from 'vitest'
import { InMemoryHabitRepository, HabitManager, NotificationService, Category, Priority } from '../src/index'

describe('HabitManager extra coverage', () => {
  it('ensureDefaultCategory when creating without category', () => {
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    const h = manager.createHabit({ id: 'h', name: 'X' })
    expect(h.category.id).toBe('default')
    expect(h.category.name).toBe('Général')
  })

  it('getOverallProgress returns 0 with no habits', () => {
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    expect(manager.getOverallProgress('2025-09-01', '2025-09-30')).toBe(0)
  })

  it('getHabit and getAllHabits includeArchived', () => {
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    const c = new Category('c', 'C')
    manager.addCategory(c)
    const h = manager.createHabit({ id: 'h', name: 'H', category: c })
    expect(manager.getHabit('h')?.id).toBe('h')
    manager.archiveHabit('h')
    expect(manager.getAllHabits({ includeArchived: true }).length).toBe(1)
  })

  it('getHabitsByCategory filters, includeArchived toggle, and setters', () => {
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    const c1 = new Category('c1', 'C1')
    const c2 = new Category('c2', 'C2')
    manager.addCategory(c1)
    manager.addCategory(c2)
    const h1 = manager.createHabit({ id: 'h1', name: 'H1', category: c1, frequency: 'weekly' })
    const h2 = manager.createHabit({ id: 'h2', name: 'H2', category: c2, frequency: 'monthly' })
    manager.setWeeklyDays('h1', [2, 4])
    manager.setMonthlyDay('h2', 10)
    expect(manager.getHabitsByCategory('c1').map(h => h.id)).toEqual(['h1'])

    // archive/exclude by default
    manager.archiveHabit('h1')
    expect(manager.getAllHabits().map(h => h.id)).toEqual(['h2'])
    // includeArchived
    expect(repo.getAllHabits({ includeArchived: true }).length).toBe(2)
  })

  it('toggle and setDone both branches, and rename/setDescription non-existing', () => {
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    const cat = new Category('c', 'C')
    manager.addCategory(cat)
    const h = manager.createHabit({ id: 'h', name: 'H', category: cat })

    // toggle -> mark
    manager.toggleHabit('h', '2025-09-01')
    expect(repo.getHabitById('h')!.isCompletedOn('2025-09-01')).toBe(true)
    // toggle -> unmark
    manager.toggleHabit('h', '2025-09-01')
    expect(repo.getHabitById('h')!.isCompletedOn('2025-09-01')).toBe(false)

    // setDone true then false
    manager.setDone('h', true, '2025-09-02')
    expect(repo.getHabitById('h')!.isCompletedOn('2025-09-02')).toBe(true)
    manager.setDone('h', false, '2025-09-02')
    expect(repo.getHabitById('h')!.isCompletedOn('2025-09-02')).toBe(false)

    // non-existing
    expect(manager.renameHabit('nope', 'x')).toBeUndefined()
    expect(manager.setDescription('nope', 'x')).toBeUndefined()
    expect(manager.archiveHabit('nope')).toBeUndefined()
    expect(manager.unarchiveHabit('nope')).toBeUndefined()
    expect(manager.toggleHabit('nope', '2025-09-01')).toBeUndefined()
    expect(manager.setDone('nope', true, '2025-09-01')).toBeUndefined()
    expect(manager.setWeeklyDays('nope', [1])).toBeUndefined()
    expect(manager.setMonthlyDay('nope', 1)).toBeUndefined()
  })
})
