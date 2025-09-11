import { describe, it, expect } from 'vitest'
import { Category } from '../src/domain/category'
import { Habit } from '../src/domain/habit'
import { Priority } from '../src/domain/priority'
import { HabitManager } from '../src/services/manager'
import { InMemoryHabitRepository } from '../src/domain/repository'
import { NotificationService } from '../src/services/notification'
import { JsonStorage } from '../src/services/storage'
import path from 'node:path'

describe('HabitManager mutations & selectors', () => {
  const cat = new Category('c1', 'Health')
  const repo = new InMemoryHabitRepository()
  const notifier = new NotificationService()
  const mgr = new HabitManager(repo, notifier)
  mgr.addCategory(cat)
  const h = new Habit('h1', 'Drink water', 'daily', cat, Priority.High)
  mgr.addHabit(h)

  it('updateHabit & setDescription', () => {
    mgr.setDescription('h1', 'Hydrate well')
    const after = mgr.getHabit('h1')!
    expect(after.description).toBe('Hydrate well')
  })

  it('completeWithNote via habit and snapshot keeps notes', () => {
    const date = '2025-09-02'
    mgr.getHabit('h1')!.completeWithNote(date, '2L')
    const storage = new JsonStorage(path.join(process.cwd(), '.data', 'test-snapshot.json'))
    storage.saveFrom(mgr, repo)
    const repo2 = new InMemoryHabitRepository()
    const mgr2 = new HabitManager(repo2, notifier)
    storage.loadInto(mgr2, repo2)
    const h2 = mgr2.getHabit('h1')!
    expect(h2.getCompletionNote(date)).toBe('2L')
  })

  it('dueOn, completedOn, nextAvailableDate', () => {
    const today = new Date().toISOString().slice(0,10)
    const due = mgr.dueOn(today)
    expect(due.find(x => x.id==='h1')).toBeTruthy()
  mgr.setDone('h1', true, today)
    const done = mgr.completedOn(today)
    expect(done.find(x => x.id==='h1')).toBeTruthy()
    const next = mgr.nextAvailableDate('h1', today)
    expect(typeof next).toBe('string')
  })
})
