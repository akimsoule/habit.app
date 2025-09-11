import { describe, it, expect } from 'vitest'
import { InMemoryHabitRepository, Category, Habit, Priority } from '../src/index'

describe('InMemoryHabitRepository', () => {
  it('saves, queries (with/without archived), and deletes', () => {
    const repo = new InMemoryHabitRepository()
    const cat = new Category('c', 'Cat')
    const h1 = new Habit('h1', 'Daily', 'daily', cat, Priority.Medium)
    const h2 = new Habit('h2', 'Daily', 'daily', cat, Priority.Medium)
    h2.archive()
    repo.saveHabit(h1)
    repo.saveHabit(h2)

    // default excludes archived
    const def = repo.getAllHabits()
    expect(def.map(h => h.id)).toEqual(['h1'])
    // includeArchived returns both
    const all = repo.getAllHabits({ includeArchived: true })
    expect(all.map(h => h.id).sort()).toEqual(['h1', 'h2'])

    // delete
    repo.deleteHabit('h1')
    expect(repo.getHabitById('h1')).toBeUndefined()
    expect(repo.getAllHabits({ includeArchived: true }).map(h => h.id)).toEqual(['h2'])
  })
})
