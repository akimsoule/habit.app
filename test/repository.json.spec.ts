import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { JsonHabitRepository } from '../src/domain/repository.json'
import { Habit, Category, Priority } from '../src/index'
import * as fsmod from 'node:fs'

describe('JsonHabitRepository', () => {
  it('persists and reloads habits', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habrepo-'))
    const file = path.join(tmpDir, 'habits.json')

    const repo = new JsonHabitRepository(file)
    const cat = new Category('c', 'Cat', 'desc')
    const h = new Habit('h', 'Weekly', 'weekly', cat, Priority.High, 'hd')
    h.setDaysOfWeek([1, 5])
    h.setDayOfMonth(10)
    h.markAsCompleted('2025-09-01')
    repo.saveHabit(h)

    const repo2 = new JsonHabitRepository(file)
    const all = repo2.getAllHabits({ includeArchived: true })
    expect(all.length).toBe(1)
    expect(all[0].category.name).toBe('Cat')
    expect(all[0].getCompletionHistory()).toContain('2025-09-01')
  })

  it('handles load error and save error gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habrepo-'))
    const badFile = path.join(tmpDir, 'bad.json')
    fs.writeFileSync(badFile, '{not json}', 'utf-8')
    const repo = new JsonHabitRepository(badFile)
    expect(repo.getAllHabits().length).toBe(0)

    // use a directory as filePath to trigger save error
    const repo2 = new JsonHabitRepository(tmpDir) // load() will also error when reading dir
    const cat = new Category('c', 'Cat')
    const h = new Habit('h', 'Daily', 'daily', cat, Priority.Low)
    repo2.saveHabit(h) // should not throw, but internal save will catch error
    // still retrievable in-memory
    expect(repo2.getHabitById('h')).toBeTruthy()
  })

  it('deleteHabit removes item', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habrepo-'))
    const file = path.join(tmpDir, 'habits.json')

    const repo = new JsonHabitRepository(file)
    const cat = new Category('c', 'Cat')
    const h = new Habit('h', 'Daily', 'daily', cat, Priority.Medium)
    repo.saveHabit(h)
    expect(repo.getHabitById('h')).toBeTruthy()
    repo.deleteHabit('h')
    expect(repo.getHabitById('h')).toBeUndefined()
  })

  it('load() early return when file does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habrepo-'))
    const file = path.join(tmpDir, 'not-exist.json')
    const repo = new JsonHabitRepository(file)
    expect(repo.getAllHabits().length).toBe(0)
  })
})
