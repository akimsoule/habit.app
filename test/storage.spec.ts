import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Category, Habit, Priority, GoalSmart, InMemoryHabitRepository, HabitManager, NotificationService, JsonStorage } from '../src/index'

describe('JsonStorage', () => {
  it('saves and loads a full snapshot', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-'))
    const file = path.join(tmpDir, 'snapshot.json')

    const repo = new InMemoryHabitRepository()
    const notifier = new NotificationService()
    const manager = new HabitManager(repo, notifier)
    const storage = new JsonStorage(file)

    const cat = new Category('cat', 'Cat')
    manager.addCategory(cat)

    const h = new Habit('h', 'Daily', 'daily', cat, Priority.Medium)
    h.markAsCompleted('2025-09-01')
    manager.addHabit(h)

    const goal = new GoalSmart('g', 'G', [h], Priority.High, 'd', '2025-09-30')
    manager.addGoal(goal)

    storage.saveFrom(manager, repo)

    // Reload fresh
    const repo2 = new InMemoryHabitRepository()
    const manager2 = new HabitManager(repo2, notifier)
    const storage2 = new JsonStorage(file)

    storage2.loadInto(manager2, repo2)

    expect(manager2.getAllCategories().length).toBe(1)
    expect(repo2.getAllHabits().length).toBe(1)
    expect(manager2.getAllGoals().length).toBe(1)
  })

  it('handles optional fields and missing category gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-'))
    const file = path.join(tmpDir, 'snapshot.json')
    // Manually craft a snapshot with a bad category reference
    const snap = {
      categories: [{ id: 'c', name: 'C' }],
      habits: [
        {
          id: 'h', name: 'N', frequency: 'daily', categoryId: 'missing', priority: 1, archived: false, completedDates: [],
        },
      ],
      goals: [],
    }
    fs.writeFileSync(file, JSON.stringify(snap), 'utf-8')

    const repo = new InMemoryHabitRepository()
    const notifier = new NotificationService()
    const manager = new HabitManager(repo, notifier)
    const storage = new JsonStorage(file)
    storage.loadInto(manager, repo)

    // category added, but habit skipped due to missing category
    expect(manager.getAllCategories().length).toBe(1)
    expect(repo.getAllHabits().length).toBe(0)
  })

  it('loadInto and saveFrom log errors gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-'))
    const dirAsFile = tmpDir // passing a directory to force save error
    const storage = new JsonStorage(dirAsFile)
    const repo = new InMemoryHabitRepository()
    const manager = new HabitManager(repo, new NotificationService())
    const spy = (console.error as any).mock ? (console.error as any) : undefined
    const errSpy = !spy ? vi.spyOn(console, 'error').mockImplementation(() => {}) : spy
    storage.saveFrom(manager, repo) // should error
    errSpy && expect(errSpy).toHaveBeenCalled()
    errSpy && errSpy.mockRestore && errSpy.mockRestore()
  })

  it('saveFrom covers optional fields (description/daysOfWeek/dayOfMonth/dueDate)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-'))
    const file = path.join(tmpDir, 'snapshot.json')
    const repo = new InMemoryHabitRepository()
    const notifier = new NotificationService()
    const manager = new HabitManager(repo, notifier)
    const storage = new JsonStorage(file)

    const cat = new Category('c', 'C', 'desc')
    manager.addCategory(cat)
  const h = new Habit('h', 'Weekly', 'weekly', cat, Priority.Medium, 'hd')
    h.setDaysOfWeek([1])
    h.setDayOfMonth(10)
    manager.addHabit(h)
  const g = new GoalSmart('g', 'G', [h], Priority.High, 'gd', '2025-09-30')
    manager.addGoal(g)

    storage.saveFrom(manager, repo)
    const raw = fs.readFileSync(file, 'utf-8')
    const snap = JSON.parse(raw)
    expect(snap.categories[0].description).toBe('desc')
    expect(snap.habits[0].daysOfWeek).toEqual([1])
    expect(snap.habits[0].dayOfMonth).toBe(10)
    expect(snap.goals[0].description).toBe('gd')
    expect(snap.goals[0].dueDate).toBe('2025-09-30')
  })
})
