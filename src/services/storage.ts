import fs from 'node:fs'
import path from 'node:path'
import { Habit } from '../domain/habit'
import { Category } from '../domain/category'
import { GoalSmart } from '../domain/goal'
import { Priority } from '../domain/priority'
import type { IHabitRepository } from '../domain/repository'
import { HabitManager } from './manager'

type CategoryDTO = { id: string; name: string; description?: string }
type HabitDTO = {
  id: string
  name: string
  description?: string
  frequency: 'daily'|'weekly'|'monthly'
  categoryId: string
  priority: Priority
  archived: boolean
  completedDates: string[]
  daysOfWeek?: number[]
  dayOfMonth?: number
}
type GoalDTO = {
  id: string
  name: string
  description?: string
  priority: Priority
  habitIds: string[]
  dueDate?: string
}

type Snapshot = {
  categories: CategoryDTO[]
  habits: HabitDTO[]
  goals: GoalDTO[]
}

export class JsonStorage {
  constructor(private filePath: string) {}

  loadInto(manager: HabitManager, repo: IHabitRepository): void {
    if (!fs.existsSync(this.filePath)) return
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const snap = JSON.parse(raw) as Snapshot

      // Categories
      const catMap = new Map<string, Category>()
      for (const c of snap.categories) {
        const cat = new Category(c.id, c.name, c.description)
        manager.addCategory(cat)
        catMap.set(cat.id, cat)
      }

      // Habits
      const habitMap = new Map<string, Habit>()
      for (const h of snap.habits) {
        const cat = catMap.get(h.categoryId)
        if (!cat) continue
        const habit = new Habit(h.id, h.name, h.frequency, cat, h.priority, h.description)
        if (h.daysOfWeek) habit.setDaysOfWeek(h.daysOfWeek)
        if (h.dayOfMonth) habit.setDayOfMonth(h.dayOfMonth)
        if (h.archived) habit.archive()
        h.completedDates.forEach(d => habit.markAsCompleted(d))
        manager.addHabit(habit) // persists into repo
        habitMap.set(habit.id, habit)
      }

      // Goals
      for (const g of snap.goals) {
        const habits = g.habitIds.map(id => habitMap.get(id)).filter(Boolean) as Habit[]
        const goal = new GoalSmart(g.id, g.name, habits, g.priority, g.description, g.dueDate)
        manager.addGoal(goal)
      }
    } catch (e) {
      console.error('Failed to load snapshot:', e)
    }
  }

  saveFrom(manager: HabitManager, repo: IHabitRepository): void {
    const categories: CategoryDTO[] = manager.getAllCategories().map(c => {
      const dto: CategoryDTO = { id: c.id, name: c.name }
      if (c.description !== undefined) dto.description = c.description
      return dto
    })
    const habits: HabitDTO[] = repo.getAllHabits({ includeArchived: true }).map(h => {
      const dto: HabitDTO = {
        id: h.id,
        name: h.name,
        frequency: h.frequency,
        categoryId: h.category.id,
        priority: h.priority,
        archived: h.archived,
        completedDates: h.getCompletionHistory(),
      }
      if (h.description !== undefined) dto.description = h.description
      if (h.daysOfWeek !== undefined) dto.daysOfWeek = h.daysOfWeek
      if (h.dayOfMonth !== undefined) dto.dayOfMonth = h.dayOfMonth
      return dto
    })
    const goals: GoalDTO[] = manager.getAllGoals().map(g => {
      const dto: GoalDTO = {
        id: g.id,
        name: g.name,
        priority: g.priority,
        habitIds: g.getHabits().map(h => h.id),
      }
      if ((g as any).description !== undefined) dto.description = (g as any).description
      if ((g as any).dueDate !== undefined) dto.dueDate = (g as any).dueDate
      return dto
    })

    const snap: Snapshot = { categories, habits, goals }
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(snap, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save snapshot:', e)
    }
  }
}
