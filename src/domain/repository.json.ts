import { Habit } from './habit'
import type { IHabitRepository } from './repository'
import { Category } from './category'
import { Priority } from './priority'
import fs from 'node:fs'
import path from 'node:path'

type HabitDTO = {
  id: string
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  category: { id: string; name: string; description?: string }
  priority: Priority
  archived: boolean
  completedDates: string[]
  daysOfWeek?: number[]
  dayOfMonth?: number
}

export class JsonHabitRepository implements IHabitRepository {
  private filePath: string
  private habits: Map<string, Habit> = new Map()

  constructor(filePath: string) {
    this.filePath = filePath
    this.load()
  }

  private toDTO(h: Habit): HabitDTO {
    const cat: { id: string; name: string; description?: string } = {
      id: h.category.id,
      name: h.category.name,
    }
    if (h.category.description !== undefined) cat.description = h.category.description
    const dto: any = {
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      category: cat,
      priority: h.priority,
      archived: h.archived,
      completedDates: h.getCompletionHistory(),
    }
    if (h.description !== undefined) dto.description = h.description
    if (h.daysOfWeek !== undefined) dto.daysOfWeek = h.daysOfWeek
    if (h.dayOfMonth !== undefined) dto.dayOfMonth = h.dayOfMonth
    return dto as HabitDTO
  }

  private fromDTO(d: HabitDTO): Habit {
    const cat = new Category(d.category.id, d.category.name, d.category.description)
    const h = new Habit(d.id, d.name, d.frequency, cat, d.priority, d.description)
    if (d.archived) h.archive()
    d.completedDates.forEach((dt) => h.markAsCompleted(dt))
    if (d.daysOfWeek) h.setDaysOfWeek(d.daysOfWeek)
    if (d.dayOfMonth) h.setDayOfMonth(d.dayOfMonth)
    return h
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const arr: HabitDTO[] = JSON.parse(raw)
      this.habits = new Map(arr.map((d) => [d.id, this.fromDTO(d)]))
    } catch (e) {
      console.error('Failed to load habits JSON:', e)
      this.habits = new Map()
    }
  }

  private save(): void {
    try {
      const arr = Array.from(this.habits.values()).map((h) => this.toDTO(h))
  fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save habits JSON:', e)
    }
  }

  saveHabit(habit: Habit): void {
    this.habits.set(habit.id, habit)
    this.save()
  }
  getHabitById(id: string): Habit | undefined {
    return this.habits.get(id)
  }
  getAllHabits(options?: { includeArchived?: boolean }): Habit[] {
    const items = Array.from(this.habits.values())
    if (options?.includeArchived) return items
    return items.filter((h) => !h.archived)
  }
  deleteHabit(id: string): void {
    this.habits.delete(id)
    this.save()
  }
}
