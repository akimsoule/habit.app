import { Category } from './category'
import { Priority } from './priority'

export class Habit {
  public id: string
  public name: string
  public description?: string | undefined
  public frequency: 'daily' | 'weekly' | 'monthly'
  public category: Category
  public priority: Priority
  public archived: boolean
  private completedDates: Set<string>
  private completionNotes: Map<string, string>
  public daysOfWeek?: number[] // 0=Dimanche .. 6=Samedi (pour weekly)
  public dayOfMonth?: number // 1..31 (pour monthly)

  constructor(
    id: string,
    name: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    category: Category,
    priority: Priority = Priority.Medium,
    description?: string
  ) {
    this.id = id
    this.name = name
    this.frequency = frequency
    this.category = category
    this.priority = priority
    this.description = description
    this.archived = false
    this.completedDates = new Set()
  this.completionNotes = new Map()
  }

  markAsCompleted(date: string): void {
    this.completedDates.add(date)
  }

  unmarkAsCompleted(date: string): void {
    this.completedDates.delete(date)
  }

  toggleCompleted(date: string): void {
    if (this.isCompletedOn(date)) {
      this.unmarkAsCompleted(date)
    } else {
      this.markAsCompleted(date)
    }
  }

  completeWithNote(date: string, note: string): void {
    this.markAsCompleted(date)
    this.completionNotes.set(date, note)
  }

  getCompletionNote(date: string): string | undefined {
    return this.completionNotes.get(date)
  }

  isCompletedOn(date: string): boolean {
    return this.completedDates.has(date)
  }

  getCompletionHistory(): string[] {
    return Array.from(this.completedDates).sort()
  }

  getCurrentStreak(): number {
    const days = this.getCompletionHistory()
    if (days.length === 0) return 0
    // partir d'aujourd'hui UTC
    let count = 0
    const today = new Date()
    let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    while (true) {
      const iso = cursor.toISOString().slice(0, 10)
      if (this.completedDates.has(iso)) {
        count++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      } else break
    }
    return count
  }

  getLongestStreak(): number {
    const days = this.getCompletionHistory()
    if (days.length === 0) return 0
    let longest = 1
    let curr = 1
    for (let i = 1; i < days.length; i++) {
      const prevStr = days[i - 1]!
      const currStr = days[i]!
      const prev = new Date(prevStr)
      const currd = new Date(currStr)
      const diff = (currd.getTime() - prev.getTime()) / (24 * 3600 * 1000)
      if (diff === 1) curr++
      else curr = 1
      if (curr > longest) longest = curr
    }
    return longest
  }

  getLastCompleted(): string | undefined {
    const history = this.getCompletionHistory()
    return history[history.length - 1]
  }

  isDueOn(dateISO: string): boolean {
  const d = new Date(dateISO)
  return this.shouldBeDoneOn(d)
  }

  archive(): void {
    this.archived = true
  }

  unarchive(): void {
    this.archived = false
  }

  setDaysOfWeek(days: number[]): void {
    this.daysOfWeek = Array.from(new Set(days)).sort()
  }

  setDayOfMonth(day: number): void {
    this.dayOfMonth = day
  }

  getProgress(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    let totalExpected = 0
    const current = new Date(start)

    while (current <= end) {
      if (this.shouldBeDoneOn(current)) {
        totalExpected++
      }
      // avancer d'un jour en UTC pour éviter les décalages de fuseau
      current.setUTCDate(current.getUTCDate() + 1)
    }

    const completed = this.getCompletionHistory().filter(
      (date) => new Date(date) >= start && new Date(date) <= end
    ).length

    return totalExpected > 0 ? completed / totalExpected : 0
  }

  private shouldBeDoneOn(date: Date): boolean {
    if (this.frequency === 'daily') return true
    if (this.frequency === 'weekly') {
      if (this.daysOfWeek && this.daysOfWeek.length > 0) {
        return this.daysOfWeek.includes(date.getUTCDay())
      }
      return date.getUTCDay() === 1 // défaut: lundi (UTC)
    }
    if (this.frequency === 'monthly') {
      if (this.dayOfMonth && this.dayOfMonth >= 1 && this.dayOfMonth <= 31) {
        return date.getUTCDate() === this.dayOfMonth
      }
      return date.getUTCDate() === 1 // défaut: 1er du mois (UTC)
    }
    return false
  }
}
