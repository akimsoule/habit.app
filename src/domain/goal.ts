import { Priority } from './priority'
import { Habit } from './habit'

export class GoalSmart {
  public id: string
  public name: string
  public description?: string | undefined
  public priority: Priority
  public dueDate?: string | undefined // ISO YYYY-MM-DD
  private habits: Habit[]

  constructor(
    id: string,
    name: string,
    habits: Habit[] = [],
    priority: Priority = Priority.Medium,
    description?: string,
    dueDate?: string
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.priority = priority
    this.habits = habits
    this.dueDate = dueDate
  }

  addHabit(habit: Habit): void {
    this.habits.push(habit)
  }

  removeHabit(habitId: string): void {
    this.habits = this.habits.filter((h) => h.id !== habitId)
  }

  setDueDate(due?: string): void {
    this.dueDate = due
  }

  setDescription(desc?: string): void {
    this.description = desc
  }

  getHabits(): Habit[] {
    return this.habits
  }

  getProgress(startDate: string, endDate?: string): number {
    const effectiveEnd = endDate ?? this.dueDate
    if (!effectiveEnd) return 0
    if (this.habits.length === 0) return 0
    const total = this.habits.reduce(
      (sum, habit) => sum + habit.getProgress(startDate, effectiveEnd),
      0
    )
    return total / this.habits.length
  }
}
