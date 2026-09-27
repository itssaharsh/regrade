import { describe, expect, it } from 'vitest'
import { parseResults, computeStats, playedPairs } from '../src/results.ts'
import { proposeBands, divisionNames, divisionLevels, bandScore } from '../src/banding.ts'
import { generateBlock, chooseRounds, circleRounds, recountRepeats, shortfallAdvice, parseTimes, isSaturday, countConstraints } from '../src/scheduler.ts'
import { toUploaderCsv } from '../src/export.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'
import { pairKey } from '../src/model.ts'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${String(i + 1).padStart(2, '0')}`)

describe('matching stays fast when a team has played every band-mate (review #17)', () => {
  it('skips a tier at once when one team has no allowed partner', () => {
    const t = ids(18); const played = new Set<string>()
    for (const o of t.slice(1)) played.add(pairKey(t[0], o))
    const { rounds, budgetStops } = chooseRounds(t, played, 4)
    expect(rounds).toHaveLength(4)
    expect(budgetStops).toBe(0)
  })
  it('abandons a search with no perfect matching at the step budget instead of freezing', () => {
    // two groups of thirteen that have played each other: everyone has a partner, but odd groups can't be perfectly matched
    const t = ids(26); const a = t.slice(0, 13), b = t.slice(13); const played = new Set<string>()
    for (const x of a) for (const y of b) played.add(pairKey(x, y))
    const { rounds, relaxed, budgetStops, repeats } = chooseRounds(t, played, 4)
    expect(rounds).toHaveLength(4)
    expect(relaxed).toBe(4)
    expect(budgetStops).toBeGreaterThan(0)
    // a relaxed week still prefers unplayed partners: one cross-group repeat a week is the minimum possible
    expect(repeats).toBe(4)
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

describe('constraint counters catch what they claim to (engineering review)', () => {
  const fx = (week: number, homeId: string, awayId: string, pitch: string) => ({ week, date: '2026-10-17', band: 'a', division: 'D1', homeId, awayId, venue: 'V', pitch, time: '09:00' })
  it('counts a double-booked slot, a team playing twice in a week and a home/away gap of 2', () => {
    const fixtures = [fx(1, 'a', 'b', 'Pitch 1'), fx(1, 'c', 'd', 'Pitch 1'), fx(1, 'a', 'e', 'Pitch 2')]
    const c = countConstraints(fixtures, new Map([['a', 2]]), new Map(), 0, 0)
    expect(c.clashes).toBe(1)
    expect(c.teamWeekViolations).toBe(1)
    expect(c.maxHomeAwayGap).toBe(2)
  })
  it('counts nothing on a clean week', () => {
    const c = countConstraints([fx(1, 'a', 'b', 'Pitch 1'), fx(1, 'c', 'd', 'Pitch 2')], new Map([['a', 1], ['c', 1]]), new Map([['b', 1], ['d', 1]]), 0, 0)
    expect([c.clashes, c.teamWeekViolations, c.maxHomeAwayGap]).toEqual([0, 0, 1])
  })
})

describe('results input edge cases (engineering review)', () => {
  it('keeps columns aligned when a tab-separated row starts with an empty cell', () => {
    const p = parseResults('Date\tHome Team\tAway Team\tHome Score\tAway Score\n\tC Reds\tD Blues\t3\t0')
    expect(p.errors).toEqual([])
    expect(p.results[0]).toMatchObject({ home: 'C Reds', away: 'D Blues', homeScore: 3, awayScore: 0 })
  })
  it('rejects a division name that would run as a spreadsheet formula', () => {
    const p = parseResults('Division,Home Team,Away Team,Home Score,Away Score\n=HYPERLINK("http://x"),A,B,1,0\nDivision 1,A,B,1,0')
    expect(p.results).toHaveLength(1)
    expect(p.errors[0].message).toMatch(/formula/)
  })
})

describe('a block keeps the slots it was generated for (engineering review)', () => {
  it('is unaffected when the setup is edited afterwards', () => {
    const parsed = parseResults(sampleResultsCsv().csv)
    const stats = computeStats(parsed.results, parsed.teams)
    const setup = sampleSetup()
    const block = generateBlock(proposeBands([...stats.values()], 3), stats, playedPairs(parsed.results), parsed.teams, setup)
    setup.venues[0].name = 'Renamed'; setup.venues[1].pitches.pop(); setup.times.pop()
    expect(block.setup.venues[0].name).toBe('Oakford Leisure Centre')
    const slots = new Set(block.setup.venues.flatMap(v => v.pitches.flatMap(p => block.setup.times.map(t => `${v.name}|${p}|${t}`))))
    expect(block.fixtures.every(f => slots.has(`${f.venue}|${f.pitch}|${f.time}`))).toBe(true)
  })
})

describe('large bands avoid repeats when unplayed pairings remain (reliability review)', () => {
  it('keeps repeats to a handful for 48 teams with 5 unplayed rounds left (was a full week of 24)', () => {
    const t = ids(48); const played = new Set<string>()
    for (const r of circleRounds(t).slice(0, 42)) for (const [x, y] of r) played.add(pairKey(x, y))
    expect(chooseRounds(t, played, 4).repeats).toBeLessThan(12)
  })
})

describe('results input: duplicates and non-Latin names (reliability review)', () => {
  it('skips the same dated fixture pasted twice', () => {
    const p = parseResults('Date,Home Team,Away Team,Home Score,Away Score\n12/09/2026,A,B,9,0\n12/09/2026,A,B,9,0')
    expect(p.results).toHaveLength(1)
    expect(p.errors[0].message).toMatch(/duplicate of row 2/)
  })
  it('keeps non-Latin team names apart', () => {
    const p = parseResults('Home Team,Away Team,Home Score,Away Score\nДинамо,Спартак,1,0')
    expect(p.errors).toEqual([])
    expect(p.teams).toHaveLength(2)
  })
  it('accepts 9:00 and 9.00 as kick-off times', () => {
    expect(parseTimes('9:00, 10.30')).toEqual({ times: ['09:00', '10:30'], error: null })
  })
})

describe('division levels (results only come from games inside a division)', () => {
  it('orders numbered divisions by their number, whatever order the file lists them in', () => {
    expect([...divisionLevels(['Division 3', 'Division 1', 'Division 2', 'Division 1'])]).toEqual([['Division 1', 0], ['Division 2', 1], ['Division 3', 2]])
  })
  it('falls back to file order for names without numbers', () => {
    expect([...divisionLevels(['Gold', 'Silver', 'Bronze', 'Gold'])]).toEqual([['Gold', 0], ['Silver', 1], ['Bronze', 2]])
  })
  it('counts a lower division as weaker, so a Division 3 team losing its games does not rank above a mid-table Division 1 team', () => {
    const st = (gdPerGame: number) => ({ teamId: 'x', played: 6, gf: 0, ga: 0, gd: 0, gdPerGame, homeGames: 3, awayGames: 3 })
    expect(bandScore(st(-0.67), 2)).toBeLessThan(bandScore(st(0), 0))
    expect(bandScore(st(3), 1)).toBeGreaterThan(bandScore(st(0.5), 0))
  })
})
