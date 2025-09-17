import { Category } from "../../domain/category";
import { GoalSmart } from "../../domain/goal";
import { Habit } from "../../domain/habit";
import type { Priority } from "../../domain/priority";
import type { IHabitRepository } from "../../domain/repository";
import type { HabitManager } from "../manager";

type CategoryDTO = { id: string; name: string; description?: string };
type HabitDTO = {
  id: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  categoryId: string;
  priority: Priority;
  archived: boolean;
  completedDates: string[];
  completionNotes?: Record<string, string>;
  daysOfWeek?: number[];
  dayOfMonth?: number;
};
type GoalDTO = {
  id: string;
  name: string;
  description?: string;
  priority: Priority;
  habitIds: string[];
  dueDate?: string;
};

export type Snapshot = {
  categories: CategoryDTO[];
  habits: HabitDTO[];
  goals: GoalDTO[];
};

/**
 * Interface abstraite pour le stockage de l'état complet.
 * Permet différentes implémentations: Node.js (fs), Browser (localStorage), etc.
 */
export interface IStorageProvider {
  /**
   * Charge l'état depuis le stockage.
   * @returns null si le stockage est vide ou invalide
   */
  loadSnapshot(): Snapshot | null;

  /**
   * Sauvegarde l'état dans le stockage.
   */
  saveSnapshot(snapshot: Snapshot): void;
}

/**
 * Classe utilitaire pour convertir état ↔ DTO
 */
export class StorageHelper {
  static toSnapshot(manager: HabitManager, repo: IHabitRepository): Snapshot {
    const categories: CategoryDTO[] = manager.getAllCategories().map((c) => {
      const dto: CategoryDTO = { id: c.id, name: c.name };
      if (c.description !== undefined) dto.description = c.description;
      return dto;
    });
    const habits: HabitDTO[] = repo
      .getAllHabits({ includeArchived: true })
      .map((h) => {
        const dto: HabitDTO = {
          id: h.id,
          name: h.name,
          frequency: h.frequency,
          categoryId: h.category.id,
          priority: h.priority,
          archived: h.archived,
          completedDates: h.getCompletionHistory(),
        };
        // exporter les notes
        const notes: Record<string, string> = {};
        for (const date of h.getCompletionHistory()) {
          const n = (h as any).getCompletionNote?.(date);
          if (n !== undefined) notes[date] = n;
        }
        if (Object.keys(notes).length > 0) (dto as any).completionNotes = notes;
        if (h.description !== undefined) dto.description = h.description;
        if (h.daysOfWeek !== undefined) dto.daysOfWeek = h.daysOfWeek;
        if (h.dayOfMonth !== undefined) dto.dayOfMonth = h.dayOfMonth;
        return dto;
      });
    const goals: GoalDTO[] = manager.getAllGoals().map((g) => {
      const dto: GoalDTO = {
        id: g.id,
        name: g.name,
        priority: g.priority,
        habitIds: g.getHabits().map((h) => h.id),
      };
      if ((g as any).description !== undefined)
        dto.description = (g as any).description;
      if ((g as any).dueDate !== undefined) dto.dueDate = (g as any).dueDate;
      return dto;
    });
    return { categories, habits, goals };
  }

  static fromSnapshot(
    snapshot: Snapshot,
    manager: HabitManager,
    repo: IHabitRepository
  ): void {
    // Categories
    const catMap = new Map<string, Category>();
    for (const c of snapshot.categories) {
      const cat = new Category(c.id, c.name, c.description);
      manager.addCategory(cat);
      catMap.set(cat.id, cat);
    }

    // Habits
    const habitMap = new Map<string, Habit>();
    for (const h of snapshot.habits) {
      const cat = catMap.get(h.categoryId);
      if (!cat) continue;
      const habit = new Habit(
        h.id,
        h.name,
        h.frequency,
        cat,
        h.priority,
        h.description
      );
      if (h.daysOfWeek) habit.setDaysOfWeek(h.daysOfWeek);
      if (h.dayOfMonth) habit.setDayOfMonth(h.dayOfMonth);
      if (h.archived) habit.archive();
      h.completedDates.forEach((d) => habit.markAsCompleted(d));
      if (h.completionNotes) {
        for (const [date, note] of Object.entries(h.completionNotes)) {
          habit.completeWithNote(date, note);
        }
      }
      manager.addHabit(habit); // persists into repo
      habitMap.set(habit.id, habit);
    }

    // Goals
    for (const g of snapshot.goals) {
      const habits = g.habitIds
        .map((id) => habitMap.get(id))
        .filter(Boolean) as Habit[];
      const goal = new GoalSmart(
        g.id,
        g.name,
        habits,
        g.priority,
        g.description,
        g.dueDate
      );
      manager.addGoal(goal);
    }
  }
}
