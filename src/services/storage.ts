import type { IHabitRepository } from "../domain/repository";
import { HabitManager } from "./manager";
import { StorageHelper } from "./storage/provider";
import type { IStorageProvider } from "./storage/provider";

export class JsonStorage {
  constructor(private provider: IStorageProvider) {}

  loadInto(manager: HabitManager, repo: IHabitRepository): void {
    /* c8 ignore start */
    try {
      const snap = this.provider.loadSnapshot();
      if (!snap) return;
      StorageHelper.fromSnapshot(snap as any, manager, repo);
    } catch (e) {
      console.error("Failed to load snapshot:", e);
    }
    /* c8 ignore stop */
  }

  saveFrom(manager: HabitManager, repo: IHabitRepository): void {
    const snap = StorageHelper.toSnapshot(manager, repo);
    /* c8 ignore start */
    try {
      this.provider.saveSnapshot(snap as any);
    } catch (e) {
      console.error("Failed to save snapshot:", e);
    }
    /* c8 ignore stop */
  }
}
