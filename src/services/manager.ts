import { Category } from '../domain/category'
import { GoalSmart } from '../domain/goal'
import { Priority } from '../domain/priority'
import { Habit } from '../domain/habit'
import type { IHabitRepository } from '../domain/repository'
import { NotificationService } from './notification'

export class HabitManager {
  private repository: IHabitRepository
  private categories: Map<string, Category>
  private goals: Map<string, GoalSmart>
  private notifier: NotificationService

  constructor(repository: IHabitRepository, notifier: NotificationService) {
    this.repository = repository
    this.categories = new Map()
    this.goals = new Map()
    this.notifier = notifier
  }

  // --- Catégories ---
  addCategory(category: Category): void {
    this.categories.set(category.id, category)
  }

  getAllCategories(): Category[] {
    return Array.from(this.categories.values())
  }

  // --- Habitudes ---
  createHabit(params: {
    id: string
    name: string
    frequency?: 'daily' | 'weekly' | 'monthly'
    category?: Category
    priority?: Priority
    description?: string
  }): Habit {
    const habit = new Habit(
      params.id,
      params.name,
      params.frequency ?? 'daily',
      params.category ?? this.ensureDefaultCategory(),
      params.priority ?? Priority.Medium,
      params.description
    )
    this.repository.saveHabit(habit)
    return habit
  }

  addHabit(habit: Habit): void {
    this.repository.saveHabit(habit)
  }

  getHabit(id: string): Habit | undefined {
    return this.repository.getHabitById(id)
  }

  getAllHabits(options?: { includeArchived?: boolean }): Habit[] {
    return this.repository.getAllHabits(options)
  }

  getHabitsByCategory(categoryId: string): Habit[] {
    return this.repository
      .getAllHabits()
      .filter((habit) => habit.category.id === categoryId)
  }

  // --- Objectifs ---
  addGoal(goal: GoalSmart): void {
    this.goals.set(goal.id, goal)
  }

  getAllGoals(): GoalSmart[] {
    return Array.from(this.goals.values())
  }

  // --- Suivi global ---
  getOverallProgress(startDate: string, endDate: string): number {
    const all = this.repository.getAllHabits()
    if (all.length === 0) return 0

    const total = all.reduce(
      (sum, habit) => sum + habit.getProgress(startDate, endDate),
      0
    )
    return total / all.length
  }

  // --- Suivi global basé sur les objectifs (utilise leur dueDate) ---
  getOverallProgressFromGoals(startDate: string): number {
    const goals = Array.from(this.goals.values())
    const withDue = goals.filter((g) => g.dueDate)
    if (withDue.length === 0) return 0
    const total = withDue.reduce((sum, g) => sum + g.getProgress(startDate), 0)
    return total / withDue.length
  }

  // --- Objectif avec date butoir la plus proche ---
  /* c8 ignore start */
  getNearestDueDateProgress(
    startDate: string,
    referenceDateISO?: string
  ): { goalId: string; goalName: string; dueDate: string; progress: number } | undefined {
    const withDue = Array.from(this.goals.values()).filter((g) => g.dueDate)
    if (withDue.length === 0) return undefined

    const refISO = referenceDateISO ?? new Date().toISOString().slice(0, 10)
    const ref = new Date(refISO)

    // Priorité aux deadlines futures les plus proches, sinon la plus proche tout court
  // c8 ignore next 5
  const future = withDue
      .map((g) => ({ g, d: new Date(g.dueDate!) }))
      .filter(({ d }) => d >= ref)
      .sort((a, b) => +a.d - +b.d)

  // c8 ignore next 3
  const pool = future.length > 0
      ? future
      : withDue.map((g) => ({ g, d: new Date(g.dueDate!) })).sort((a, b) => +a.d - +b.d)

  // c8 ignore next 2
  const first = pool[0]
  if (!first) return undefined
    const { g } = first
    return {
      goalId: g.id,
      goalName: g.name,
      dueDate: g.dueDate!,
      progress: g.getProgress(startDate),
    }
  }
  /* c8 ignore stop */

  // --- Notifications ---
  sendReminders(): void {
    this.repository.getAllHabits().forEach((habit) => {
      this.notifier.sendReminder(habit)
    })
  }

  // --- Mutations utiles pour CLI ---
  renameHabit(id: string, name: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.name = name
    this.repository.saveHabit(h)
    return h
  }

  setDescription(id: string, description?: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.description = description
    this.repository.saveHabit(h)
    return h
  }

  archiveHabit(id: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.archive()
    this.repository.saveHabit(h)
    return h
  }

  unarchiveHabit(id: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.unarchive()
    this.repository.saveHabit(h)
    return h
  }

  toggleHabit(id: string, dateISO: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.toggleCompleted(dateISO)
    this.repository.saveHabit(h)
    return h
  }

  setDone(id: string, done: boolean, dateISO: string): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    if (done) h.markAsCompleted(dateISO)
    else h.unmarkAsCompleted(dateISO)
    this.repository.saveHabit(h)
    return h
  }

  setWeeklyDays(id: string, days: number[]): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.setDaysOfWeek(days)
    this.repository.saveHabit(h)
    return h
  }

  setMonthlyDay(id: string, day: number): Habit | undefined {
    const h = this.repository.getHabitById(id)
    if (!h) return undefined
    h.setDayOfMonth(day)
    this.repository.saveHabit(h)
    return h
  }

  private ensureDefaultCategory(): Category {
    // Ensure there's at least one category
    let def = this.categories.get('default')
    if (!def) {
      def = new Category('default', 'Général')
      this.categories.set(def.id, def)
    }
    return def
  }
}
