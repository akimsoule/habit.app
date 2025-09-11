import { Habit } from '../domain/habit'

export class NotificationService {
  sendReminder(habit: Habit): void {
    console.log(
      `🔔 Rappel : N'oublie pas de faire "${habit.name}" [${habit.category.name}] (Priorité: ${habit.priority})`
    )
  }
}
