import { Habit } from './habit'

export interface IHabitRepository {
  saveHabit(habit: Habit): void
  getHabitById(id: string): Habit | undefined
  getAllHabits(options?: { includeArchived?: boolean }): Habit[]
  deleteHabit(id: string): void
}

export class InMemoryHabitRepository implements IHabitRepository {
  private habits: Map<string, Habit> = new Map()

  saveHabit(habit: Habit): void {
    this.habits.set(habit.id, habit)
  }

  getHabitById(id: string): Habit | undefined {
    return this.habits.get(id)
  }

  getAllHabits(options?: { includeArchived?: boolean }): Habit[] {
    const items = Array.from(this.habits.values())
    if (options?.includeArchived) return items
    return items.filter(h => !h.archived)
  }

  deleteHabit(id: string): void {
    this.habits.delete(id)
  }
}
