import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION, STORAGE_KEY, loadData, saveData } from '../lib/storage'

describe('storage', () => {
  it('loads a useful default save', () => {
    const data = loadData()
    expect(data.schemaVersion).toBe(CURRENT_VERSION)
    expect(data.character.name).toBe('冒险者')
    expect(data.quests.length).toBeGreaterThan(0)
  })

  it('migrates partial legacy data with safe defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 0, character: { name: '小林' }, capitals: { health: 130 } }))
    const data = loadData()
    expect(data.schemaVersion).toBe(CURRENT_VERSION)
    expect(data.character.name).toBe('小林')
    expect(data.capitals.health).toBe(100)
    expect(data.psyche.energy).toBeGreaterThan(0)
  })

  it('persists a save', () => {
    const data = loadData()
    data.xp = 999
    saveData(data)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').xp).toBe(999)
  })
})
