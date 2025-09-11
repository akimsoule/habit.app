import { describe, it, expect, vi } from 'vitest'
import { NotificationService } from '../src/index'
import { Category, Habit, Priority } from '../src/index'

describe('NotificationService', () => {
  it('sends reminder (logs to console)', () => {
    const svc = new NotificationService()
    const cat = new Category('c', 'Cat')
    const h = new Habit('h', 'Daily', 'daily', cat, Priority.Medium)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    svc.sendReminder(h)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
