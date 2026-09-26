import { describe, expect, it } from 'vitest'
import { circleRounds, chooseRounds, generateBlock, BYE } from '../src/scheduler.ts'
import { proposeBands, moveTeam, bandSpread } from '../src/banding.ts'
import { parseResults, computeStats, playedPairs } from '../src/results.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'
import { toUploaderCsv, UPLOADER_COLUMNS } from '../src/export.ts'
import { pairKey } from '../src/model.ts'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`)

describe('circleRounds', () => {
  it('plays every team once per round and every pair exactly once', () => {
    const rounds = circleRounds(ids(16))
    expect(rounds).toHaveLength(15)
    const seen = new Set<string>()
    for (const r of rounds) {
      const teams = r.flat()
      expect(new Set(teams).size).toBe(16)
      for (const [a, b] of r) { const k = pairKey(a, b); expect(seen.has(k)).toBe(false); seen.add(k) }
    }
    expect(seen.size).toBe(120)
  })
  it('gives odd counts a bye', () => {
    const rounds = circleRounds(ids(5))
    expect(rounds).toHaveLength(5)
    for (const r of rounds) expect(r.flat().filter(t => t === BYE)).toHaveLength(1)
  })
})

describe('chooseRounds', () => {
  it('avoids pairings already played and keeps every team within one home game of its away games', () => {
    const all = circleRounds(ids(8))
    const played = new Set(all[0].map(([a, b]) => pairKey(a, b)))
    const { rounds, repeats } = chooseRounds(ids(8), played, 4)
    expect(rounds).toHaveLength(4)
    expect(repeats).toBe(0)
    const bal = new Map<string, number>()
    for (const r of rounds) for (const [h, a] of r) { bal.set(h, (bal.get(h) ?? 0) + 1); bal.set(a, (bal.get(a) ?? 0) - 1) }
    for (const v of bal.values()) expect(Math.abs(v)).toBeLessThanOrEqual(1)
    const seen = new Set<string>()
    for (const r of rounds) for (const [h, a] of r) { const k = pairKey(h, a); expect(seen.has(k)).toBe(false); seen.add(k); expect(played.has(k)).toBe(false) }
  })
})

describe('banding', () => {
  const parsed = parseResults(sampleResultsCsv().csv)
  const stats = computeStats(parsed.results, parsed.teams)
  it('parses the seeded season without errors', () => {
    expect(parsed.errors).toHaveLength(0)
    expect(parsed.teams).toHaveLength(48)
    expect(parsed.results).toHaveLength(3 * 6 * 8)
  })
  it('proposes three bands of sixteen ordered by goal difference per game', () => {
    const bands = proposeBands([...stats.values()], 3)
    expect(bands.map(b => b.teamIds.length)).toEqual([16, 16, 16])
    const first = stats.get(bands[0].teamIds[0])!.gdPerGame, last = stats.get(bands[2].teamIds[15])!.gdPerGame
    expect(first).toBeGreaterThan(last)
    expect(bandSpread(bands[0], stats)).toBeGreaterThan(0)
  })
  it('moves a team between bands without losing anyone', () => {
    const bands = proposeBands([...stats.values()], 3)
    const moved = moveTeam(bands, bands[0].teamIds[15], bands[1].id, 0)
    expect(moved[0].teamIds).toHaveLength(15)
    expect(moved[1].teamIds).toHaveLength(17)
    expect(moved.flatMap(b => b.teamIds)).toHaveLength(48)
  })
})

describe('generateBlock', () => {
  const parsed = parseResults(sampleResultsCsv().csv)
  const stats = computeStats(parsed.results, parsed.teams)
  const played = playedPairs(parsed.results)
  const bands = proposeBands([...stats.values()], 3)
  it('fills 24 fixtures a week into 24 slots with no clashes, no repeats and balanced home/away', () => {
    const block = generateBlock(bands, stats, played, parsed.teams, sampleSetup())
    expect(block.fixtures).toHaveLength(96)
    expect(block.unscheduled).toHaveLength(0)
    expect(block.counters.clashes).toBe(0)
    expect(block.counters.teamWeekViolations).toBe(0)
    expect(block.counters.repeats).toBe(0)
    expect(block.counters.maxHomeAwayGap).toBeLessThanOrEqual(1)
  })
  it('lists exactly the fixtures that do not fit when a pitch is removed, never a silent partial grid', () => {
    const setup = sampleSetup()
    setup.venues[1].pitches = setup.venues[1].pitches.slice(0, 2)
    const block = generateBlock(bands, stats, played, parsed.teams, setup)
    expect(block.slotsPerWeek).toBe(18)
    expect(block.unscheduled).toHaveLength(6 * 4)
    expect(block.fixtures).toHaveLength(18 * 4)
    expect(block.counters.clashes).toBe(0)
    expect(block.unscheduled[0].reason).toMatch(/No free slot/)
  })
  it('exports the FA uploader layout with DD/MM/YYYY dates and blank scores', () => {
    const block = generateBlock(bands, stats, played, parsed.teams, sampleSetup())
    const name = (id: string) => parsed.teams.find(t => t.id === id)!.name
    const csv = toUploaderCsv(block, name)
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toBe(UPLOADER_COLUMNS.join(','))
    expect(lines).toHaveLength(97)
    expect(lines[1]).toMatch(/^\d{2}\/\d{2}\/\d{4},\d{2}:\d{2},Band [ABC],/)
    expect(lines[1].endsWith(',,')).toBe(true)
  })
})
