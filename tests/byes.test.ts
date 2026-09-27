import { describe, expect, it } from 'vitest'
import { chooseRounds, generateBlock, BYE } from '../src/scheduler.ts'
import { proposeBands, moveTeam } from '../src/banding.ts'
import { parseResults, computeStats, playedPairs } from '../src/results.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${String(i + 1).padStart(2, '0')}`)
const byeCounts = (rounds: [string, string][][]) => {
  const m = new Map<string, number>()
  for (const r of rounds) for (const [a, b] of r) if (a === BYE || b === BYE) { const t = a === BYE ? b : a; m.set(t, (m.get(t) ?? 0) + 1) }
  return m
}

describe('byes rotate across the block', () => {
  for (const n of [5, 7, 15, 17]) {
    it(`gives no team more than one bye in four weeks with ${n} teams`, () => {
      const { rounds } = chooseRounds(ids(n), new Set(), 4)
      expect(rounds).toHaveLength(4)
      const counts = byeCounts(rounds)
      expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(4)
      expect(Math.max(...counts.values())).toBe(1)
    })
  }
  it('reports each bye in the block after a move makes two bands odd', () => {
    const parsed = parseResults(sampleResultsCsv().csv)
    const stats = computeStats(parsed.results, parsed.teams)
    const bands0 = proposeBands([...stats.values()], 3)
    const bands = moveTeam(bands0, bands0[0].teamIds[6], bands0[1].id, 0)
    const block = generateBlock(bands, stats, playedPairs(parsed.results), parsed.teams, sampleSetup())
    expect(block.byes).toHaveLength(8)
    const perTeam = new Map<string, number>()
    for (const b of block.byes) perTeam.set(b.teamId, (perTeam.get(b.teamId) ?? 0) + 1)
    expect(Math.max(...perTeam.values())).toBe(1)
    expect(block.fixtures).toHaveLength(92)
    expect(block.counters.clashes).toBe(0)
  })
})
