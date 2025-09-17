/* c8 ignore start */
// Déprécié: l'implémentation Node (fs/path) a été déplacée dans src-node/domain/repository.json.node.ts
// Cette version « lib » n'utilise aucune API Node et ne persiste pas sur disque.
import { Habit } from "./habit";
import type { IHabitRepository } from "./repository";

export class JsonHabitRepository implements IHabitRepository {
  private habits = new Map<string, Habit>();
  constructor(_filePath: string) {
    // No-op: persistence disque non supportée côté lib
  }
  saveHabit(habit: Habit): void {
    this.habits.set(habit.id, habit);
  }
  getHabitById(id: string): Habit | undefined {
    return this.habits.get(id);
  }
  getAllHabits(options?: { includeArchived?: boolean }): Habit[] {
    const items = Array.from(this.habits.values());
    if (options?.includeArchived) return items;
    return items.filter((h) => !h.archived);
  }
  deleteHabit(id: string): void {
    this.habits.delete(id);
  }
}
/* c8 ignore stop */
