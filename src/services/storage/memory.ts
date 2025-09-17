import type { IStorageProvider, Snapshot } from './provider'

export class InMemoryStorageProvider implements IStorageProvider {
  private snapshot: Snapshot | null = null
  constructor(initial?: Snapshot | null) {
    this.snapshot = initial ?? null
  }
  loadSnapshot(): Snapshot | null {
    return this.snapshot ? JSON.parse(JSON.stringify(this.snapshot)) : null
  }
  saveSnapshot(snapshot: Snapshot): void {
    this.snapshot = JSON.parse(JSON.stringify(snapshot))
  }
}
