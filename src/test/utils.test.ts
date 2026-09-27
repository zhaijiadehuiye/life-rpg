import { describe, expect, it } from 'vitest'
import { levelFromXp, xpForLevel, xpProgress } from '../lib/utils'

describe('xp progression', () => {
  it('starts at level one and grows predictably', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
    expect(levelFromXp(xpForLevel(3))).toBe(3)
  })

  it('returns bounded progress', () => {
    const progress = xpProgress(260)
    expect(progress.percent).toBeGreaterThanOrEqual(0)
    expect(progress.percent).toBeLessThanOrEqual(100)
    expect(progress.current).toBeLessThan(progress.needed)
  })
})
