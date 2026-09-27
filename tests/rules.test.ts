import { describe, expect, it } from 'vitest'
import { parseResults, computeStats, playedPairs } from '../src/results.ts'
import { proposeBands, divisionNames } from '../src/banding.ts'
import { generateBlock, chooseRounds, recountRepeats, shortfallAdvice, parseTimes, isSaturday } from '../src/scheduler.ts'
import { toUploaderCsv } from '../src/export.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'
import { pairKey } from '../src/model.ts'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${String(i + 1).padStart(2, '0')}`)

describe('matching stays fast when a team has played every band-mate (review #17)', () => {
  it('schedules 18 teams in under 500 ms', () => {
    const t = ids(18); const played = new Set<string>()
    for (const o of t.slice(1)) played.add(pairKey(t[0], o))
    const t0 = performance.now(); const { rounds } = chooseRounds(t, played, 4); const ms = performance.now() - t0
    expect(rounds).toHaveLength(4)
    expect(ms).toBeLessThan(500)
  })
})

describe('tiny bands keep every week (review #18)', () => {
  it('gives a 3-team band four weeks with the repeat counted', () => {
    const { rounds, repeats } = chooseRounds(ids(3), new Set(), 4)
    expect(rounds).toHaveLength(4)
    expect(repeats).toBeGreaterThan(0)
  })
})

describe('results input (review #19, #21, #0)', () => {
  it('accepts tab-separated paste from a spreadsheet', () => {
    const p = parseResults('Date\tHome Team\tAway Team\tHome Score\tAway Score\n12/09/2026\tA Reds\tB Blues\t2\t1')
    expect(p.errors).toHaveLength(0)
    expect(p.results).toHaveLength(1)
  })
  it('rejects negative, non-integer and non-numeric scores and a team playing itself', () => {
    const p = parseResults('Home Team,Away Team,Home Score,Away Score\nA,B,-1,2\nA,B,0x10,1\nA,B,Infinity,1\nA,B,2.5,1\nA,A,3,1\nA,B,3,1')
    expect(p.results).toHaveLength(1)
    expect(p.errors.map(e => e.row)).toEqual([2, 3, 4, 5, 6])
  })
  it('rejects team names that would run as a spreadsheet formula', () => {
    const p = parseResults('Home Team,Away Team,Home Score,Away Score\n=HYPERLINK("x"),B,1,0\nA,B,1,0')
    expect(p.results).toHaveLength(1)
    expect(p.errors[0].message).toMatch(/formula/)
  })
})

describe('export uses the league\'s own division names (review #22)', () => {
  it('names each band after the division most of its teams came from', () => {
    const parsed = parseResults(sampleResultsCsv().csv)
    const stats = computeStats(parsed.results, parsed.teams)
    const bands = proposeBands([...stats.values()], 3)
    const recorded = new Map<string, string>()
    for (const r of parsed.results) { recorded.set(r.home.toLowerCase().replace(/[^a-z0-9]+/g, '-'), r.division); recorded.set(r.away.toLowerCase().replace(/[^a-z0-9]+/g, '-'), r.division) }
    const names = divisionNames(bands, recorded)
    expect(new Set(names.values()).size).toBe(3)
    for (const n of names.values()) expect(n).toMatch(/^Division [123]$/)
    const block = generateBlock(bands, stats, playedPairs(parsed.results), parsed.teams, sampleSetup(), names)
    const csv = toUploaderCsv(block, id => parsed.teams.find(t => t.id === id)!.name)
    expect(csv).not.toMatch(/,Band [ABC],/)
    expect(csv).toMatch(/,Division [123],/)
  })
})

describe('setup helpers (review #20, #26, #48) and the independent recount (review #23)', () => {
  it('knows a Saturday', () => {
    expect(isSaturday('2026-10-17')).toBe(true)
    expect(isSaturday('2026-10-18')).toBe(false)
  })
  it('parses kick-off times and rejects bad ones', () => {
    expect(parseTimes('09:00, 10:00,11:30')).toEqual({ times: ['09:00', '10:00', '11:30'], error: null })
    expect(parseTimes('9am, 10:00').error).toMatch(/9am/)
    expect(parseTimes('10:00, 10:00').error).toMatch(/twice/)
  })
  it('advises exactly how many pitches or kick-offs close a shortfall', () => {
    expect(shortfallAdvice(24, 18, 3, 6)).toBe('Add 2 pitches, or 1 kick-off time.')
    expect(shortfallAdvice(25, 24, 3, 8)).toBe('Add 1 pitch, or 1 kick-off time.')
  })
  it('recounts repeat pairings from the fixtures themselves', () => {
    const parsed = parseResults(sampleResultsCsv().csv)
    const stats = computeStats(parsed.results, parsed.teams)
    const played = playedPairs(parsed.results)
    const block = generateBlock(proposeBands([...stats.values()], 3), stats, played, parsed.teams, sampleSetup())
    expect(recountRepeats(block.fixtures, played)).toBe(block.counters.repeats)
    const forced = [...block.fixtures, { ...block.fixtures[0], week: 9 }]
    expect(recountRepeats(forced, played)).toBe(block.counters.repeats + 1)
  })
})
