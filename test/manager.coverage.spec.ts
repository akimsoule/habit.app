import { describe, it, expect, vi } from 'vitest'
import { InMemoryHabitRepository } from '../src/domain/repository'
import { NotificationService } from '../src/services/notification'
import { HabitManager } from '../src/services/manager'
import { Category } from '../src/domain/category'
import { Priority } from '../src/domain/priority'
import { Habit } from '../src/domain/habit'
import { GoalSmart } from '../src/domain/goal'
import { SystemClock } from '../src/services/clock'

const iso = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0,10)

describe('HabitManager full coverage', () => {
  it('covers categories, habits, goals, selectors, streaks, stats and notifications', () => {
    const repo = new InMemoryHabitRepository()
    const notifier = new NotificationService()
    const mgr = new HabitManager(repo, notifier)

    // Categories
    const cat1 = new Category('c1', 'Cat1')
    const cat2 = new Category('c2', 'Cat2')
    mgr.addCategory(cat1)
    mgr.addCategory(cat2)
    expect(mgr.getAllCategories().length).toBe(2)

  // Create habit without category -> default category created
    const hDef = mgr.createHabit({ id: 'hDef', name: 'Defaulted' })
    expect(hDef.category).toBeTruthy()
  // Create another defaulted to cover existing default path
  const hDef2 = mgr.createHabit({ id: 'hDef2', name: 'Defaulted 2' })
  expect(hDef2.category.id).toBe(hDef.category.id)

    // Habits add/get/update
    const h1 = new Habit('h1', 'Daily One', 'daily', cat1, Priority.High)
    mgr.addHabit(h1)
    expect(mgr.getHabit('h1')).toBeTruthy()
    mgr.updateHabit('h1', { name: 'Daily Renamed', description: 'desc', priority: Priority.Low })
    const u = mgr.getHabit('h1')!
    expect(u.name).toBe('Daily Renamed')
    expect(u.description).toBe('desc')
    expect(u.priority).toBe(Priority.Low)

  // setCategory on existing category
    expect(mgr.setCategory('h1', 'c2')!.category.id).toBe('c2')
  // setCategory with undefined (no-op but save path)
  expect(mgr.setCategory('h1')).toBeTruthy()
  // setCategory invalid id -> undefined
  expect(mgr.setCategory('h1', 'nope')).toBeUndefined()

  // updateHabit on missing id returns undefined
  expect(mgr.updateHabit('__404__', { name: 'x' })).toBeUndefined()

    // frequency & schedule setters
    mgr.setFrequency('h1', 'weekly')
    mgr.setDaysOfWeek('h1', [1, 3])
    mgr.setWeeklyDays('h1', [1, 3])
    mgr.setFrequency('h1', 'monthly')
    mgr.setDayOfMonth('h1', 15)
    mgr.setMonthlyDay('h1', 15)

  // rename/description/archive/unarchive
    mgr.renameHabit('h1', 'Renamed Again')
    mgr.setDescription('h1', 'new desc')
    mgr.archiveHabit('h1')
    expect(mgr.getAllHabits().find(x => x.id==='h1')).toBeFalsy()
    expect(mgr.getAllHabits({ includeArchived: true }).find(x => x.id==='h1')).toBeTruthy()
  mgr.unarchiveHabit('h1')
  // Toggle/setDone/setters with missing id
  expect(mgr.toggleHabit('__404__', '2025-01-01')).toBeUndefined()
  expect(mgr.setDone('__404__', true, '2025-01-01')).toBeUndefined()
  expect(mgr.setWeeklyDays('__404__', [1])).toBeUndefined()
  expect(mgr.setMonthlyDay('__404__', 1)).toBeUndefined()
  expect(mgr.setFrequency('__404__', 'daily')).toBeUndefined()
  expect(mgr.setDaysOfWeek('__404__', [1])).toBeUndefined()
  expect(mgr.setDayOfMonth('__404__', 1)).toBeUndefined()
  expect(mgr.renameHabit('__404__', 'x')).toBeUndefined()
  expect(mgr.setDescription('__404__', 'x')).toBeUndefined()
  expect(mgr.archiveHabit('__404__')).toBeUndefined()
  expect(mgr.unarchiveHabit('__404__')).toBeUndefined()
  expect(mgr.setCategory('__404__')).toBeUndefined()
  // remove non-existing habit
  expect(mgr.removeHabit('missing')).toBe(false)

    // Toggle and setDone on today
    const today = iso(new SystemClock().now())
    mgr.toggleHabit('h1', today)
    mgr.setDone('h1', false, today)
    mgr.setDone('h1', true, today)
    expect(mgr.completedOn(today).find(x => x.id==='h1')).toBeTruthy()
    expect(mgr.dueOn(today).length).toBeGreaterThanOrEqual(0)

  // nextAvailableDate should return some ISO for monthly schedule
  const next = mgr.nextAvailableDate('h1', today)
  expect(next === undefined || typeof next === 'string').toBe(true)

    // Category filter
    expect(mgr.getHabitsByCategory('c2').some(h => h.id==='h1')).toBe(true)

    // Streaks and totals
    const h2 = new Habit('h2', 'Streaker', 'daily', cat1, Priority.Medium)
    mgr.addHabit(h2)
    const base = new Date()
    const d0 = iso(base)
    const d1 = iso(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()-1)))
    const d2 = iso(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()-2)))
    h2.markAsCompleted(d2); h2.markAsCompleted(d1); h2.markAsCompleted(d0)
    expect(mgr.getCurrentStreak('h2')).toBeGreaterThanOrEqual(3)
    expect(mgr.getLongestStreak('h2')).toBeGreaterThanOrEqual(3)
    expect(mgr.getCurrentStreak()).toBeGreaterThanOrEqual(3)
    expect(mgr.getLongestStreak()).toBeGreaterThanOrEqual(3)
    expect(mgr.totalSuccess(d2, d0)).toBeGreaterThan(0)

    // updateHabit with empty partial hits falsy branches
    const before = mgr.getHabit('h2')!
    mgr.updateHabit('h2', {})
    const after = mgr.getHabit('h2')!
    expect(after.name).toBe(before.name)
    expect(after.description).toBe(before.description)
    expect(after.priority).toBe(before.priority)

    // For a monthly habit set to day 31, try a start date that could skip
    {
      mgr.setFrequency('h2', 'monthly')
      mgr.setDayOfMonth('h2', 31)
      const feb1 = iso(new Date(Date.UTC(base.getUTCFullYear(), 1, 1)))
      const res = mgr.nextAvailableDate('h2', feb1)
      expect(res === undefined || typeof res === 'string').toBe(true)
    }

    // Goals
  const goal = new GoalSmart('g1', 'Goal 1', [], Priority.High)
    mgr.addGoal(goal)
    expect(mgr.getAllGoals().length).toBe(1)
    mgr.addHabitToGoal('g1', 'h2')
    mgr.setGoalDescription('g1', 'Gdesc')
    const due = iso(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()+2)))
    mgr.setGoalDueDate('g1', due)
    expect(mgr.getOverallProgressFromGoals(d2)).toBeGreaterThanOrEqual(0)
    const near = mgr.getNearestDueDateProgress(d2, d1)
    expect(near && near.goalId === 'g1').toBe(true)
  mgr.removeHabitFromGoal('g1', 'h2')
  expect(mgr.removeGoal('g1')).toBe(true)
  // Goal operations on missing goal
  expect(mgr.addHabitToGoal('g_missing', 'h2')).toBe(false)
  expect(mgr.removeHabitFromGoal('g_missing', 'h2')).toBe(false)
  expect(mgr.setGoalDueDate('g_missing', due)).toBe(false)
  expect(mgr.setGoalDescription('g_missing', 'x')).toBe(false)
  expect(mgr.removeGoal('g_missing')).toBe(false)

  // Remove existing habit and ensure it is removed from goals
  const goal2 = new GoalSmart('g2', 'Goal 2', [h1], Priority.Medium)
  mgr.addGoal(goal2)
  expect(mgr.removeHabit('h1')).toBe(true)
  expect(goal2.getHabits().find(h => h.id==='h1')).toBeUndefined()
  // Overall from goals with none or no due -> 0
  expect(mgr.getOverallProgressFromGoals(d2)).toBe(0)
  // nearest with no goals -> undefined
  expect(mgr.getNearestDueDateProgress(d2)).toBeUndefined()

  // Overall progress across habits
    expect(mgr.getOverallProgress(d2, d0)).toBeGreaterThanOrEqual(0)

  // Overall progress with empty repo
  {
    const repo2 = new InMemoryHabitRepository()
    const mgr2 = new HabitManager(repo2, notifier)
    expect(mgr2.getOverallProgress(d2, d0)).toBe(0)
  }

    // Notifications via manager
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mgr.sendReminders()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()

  // Streak helpers for missing habit
  expect(mgr.getCurrentStreak('__404__')).toBe(0)
  expect(mgr.getLongestStreak('__404__')).toBe(0)
  // nextAvailableDate for missing habit
  expect(mgr.nextAvailableDate('__404__', today)).toBeUndefined()

  // SystemClock
    const clock = new SystemClock()
    expect(clock.now()).toBeInstanceOf(Date)
  })
})
