import type { Band, Block, Counters, Fixture, Setup, Slot, Team, TeamStats, Unscheduled } from './model.ts'
import { pairKey, slotKey } from './model.ts'

export const BYE = '__bye__'
export type Pair = [string, string]

/** Circle-method round robin. Every team plays once per round; every pair appears exactly once across all rounds. Odd counts get a bye. */
export function circleRounds(ids: string[]): Pair[][] {
  const teams = [...ids]
  if (teams.length % 2 === 1) teams.push(BYE)
  const n = teams.length
  if (n < 2) return []
  const rot = teams.slice(1)
  const rounds: Pair[][] = []
  for (let r = 0; r < n - 1; r++) {
    const arr = [teams[0], ...rot]
    const pairs: Pair[] = []
    for (let i = 0; i < n / 2; i++) pairs.push([arr[i], arr[n - 1 - i]])
    rounds.push(pairs)
    rot.unshift(rot.pop()!)
  }
  return rounds
}

/**
 * Choose the block's pairings week by week as a perfect matching that (1) never repeats a pairing already played this season
 * or earlier in the block, and (2) keeps every team's block home/away gap within one, by pairing a team that is "owed" a home game
 * with one that is owed an away game. Backtracking over partners in a fixed order keeps it deterministic. If the strict search
 * fails for a week, the balance constraint is relaxed; if that fails too, played pairings are allowed and counted as repeats.
 */
export function chooseRounds(ids: string[], played: Set<string>, weeks: number): { rounds: Pair[][]; repeats: number; relaxed: number } {
  const teams = [...ids].sort()
  if (teams.length % 2 === 1) teams.push(BYE)
  const rounds: Pair[][] = []
  const used = new Set<string>()
  const balance = new Map<string, number>(teams.map(t => [t, 0]))
  let repeats = 0, relaxed = 0
  for (let w = 0; w < weeks; w++) {
    const tryMatch = (strictBalance: boolean, allowPlayed: boolean): Pair[] | null => {
      const order = [...teams].sort((a, b) => Math.abs(balance.get(b)!) - Math.abs(balance.get(a)!) || a.localeCompare(b))
      const res: Pair[] = []
      const taken = new Set<string>()
      const rec = (): boolean => {
        const a = order.find(t => !taken.has(t))
        if (!a) return true
        taken.add(a)
        for (const b of order) {
          if (taken.has(b)) continue
          const k = pairKey(a, b)
          if (used.has(k)) continue
          if (!allowPlayed && a !== BYE && b !== BYE && played.has(k)) continue
          if (strictBalance && a !== BYE && b !== BYE && balance.get(a)! === balance.get(b)! && balance.get(a) !== 0) continue
          taken.add(b); res.push([a, b])
          if (rec()) return true
          taken.delete(b); res.pop()
        }
        taken.delete(a)
        return false
      }
      return rec() ? res : null
    }
    let pairs = tryMatch(true, false)
    if (!pairs) { pairs = tryMatch(false, false); if (pairs) relaxed++ }
    if (!pairs) { pairs = tryMatch(false, true); if (pairs) relaxed++ }
    if (!pairs) break
    // orient: the team owed a home game plays at home; ties go to the alphabetically earlier team so runs stay deterministic
    const oriented: Pair[] = pairs.map(([a, b]) => {
      if (a === BYE || b === BYE) return [a, b]
      const ba = balance.get(a)!, bb = balance.get(b)!
      return ba < bb || (ba === bb && a < b) ? [a, b] : [b, a]
    })
    for (const [h, a] of oriented) {
      if (h === BYE || a === BYE) continue
      const k = pairKey(h, a)
      if (played.has(k)) repeats++
      used.add(k)
      balance.set(h, balance.get(h)! + 1); balance.set(a, balance.get(a)! - 1)
    }
    rounds.push(oriented)
  }
  return { rounds, repeats, relaxed }
}

export function slotsFor(setup: Setup): Slot[] {
  const slots: Slot[] = []
  for (const v of setup.venues) for (const time of setup.times) for (const pitch of v.pitches) slots.push({ venue: v.name, pitch, time })
  return slots
}

export function saturday(iso: string, weeksAhead: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7 * weeksAhead)
  return d.toISOString().slice(0, 10)
}

interface Placement { fixture: Omit<Fixture, 'venue' | 'pitch' | 'time'>; bandIndex: number }

/**
 * Generate the next block: pairings per band (chooseRounds), then a venue/pitch/time slot for every fixture.
 * Hard constraints: one fixture per slot, one fixture per team per week. Preferences, scored and logged, never violated silently:
 * a band plays at one venue on a given Saturday (rotating between venues), and a club's teams share a venue.
 */
export function generateBlock(bands: Band[], stats: Map<string, TeamStats>, played: Set<string>, teams: Team[], setup: Setup): Block {
  const log: string[] = []
  const slots = slotsFor(setup)
  const clubOf = new Map(teams.map(t => [t.id, t.club]))
  const fixtures: Fixture[] = []
  const unscheduled: Unscheduled[] = []
  const byes: { week: number; teamId: string }[] = []
  let repeats = 0

  // 1. pairings per band per week (already oriented home/away)
  const weekly: Placement[][] = Array.from({ length: setup.weeks }, () => [])
  bands.forEach((band, bi) => {
    const { rounds, repeats: rep, relaxed } = chooseRounds(band.teamIds, played, setup.weeks)
    repeats += rep
    log.push(`${band.name}: ${band.teamIds.length} teams, ${rounds.length} weeks of pairings, ${rep} repeat pairing${rep === 1 ? '' : 's'} against this season${relaxed ? `, ${relaxed} week${relaxed === 1 ? '' : 's'} with a relaxed constraint` : ''}`)
    rounds.forEach((pairs, w) => {
      for (const [home, away] of pairs) {
        if (home === BYE || away === BYE) { byes.push({ week: w + 1, teamId: home === BYE ? away : home }); continue }
        weekly[w].push({ fixture: { week: w + 1, date: saturday(setup.firstSaturday, w), division: band.name, homeId: home, awayId: away }, bandIndex: bi })
      }
    })
  })

  // 2. slot assignment per week
  const timeIndex = new Map(setup.times.map((t, i) => [t, i]))
  const pitchIndex = (s: Slot): number => setup.venues.find(v => v.name === s.venue)?.pitches.indexOf(s.pitch) ?? 0
  weekly.forEach((placements, w) => {
    const used = new Set<string>()
    const clubVenue = new Map<string, string>()
    const bandVenue = new Map<number, string>()
    const week = w + 1
    for (const p of placements) {
      const pref = setup.venues.length ? setup.venues[(p.bandIndex + w) % setup.venues.length].name : ''
      const ch = clubOf.get(p.fixture.homeId), ca = clubOf.get(p.fixture.awayId)
      const wantClub = (ch && clubVenue.get(ch)) || (ca && clubVenue.get(ca)) || ''
      let best: { slot: Slot; score: number } | null = null
      for (const s of slots) {
        if (used.has(slotKey(s))) continue
        let score = 0
        if (s.venue !== (bandVenue.get(p.bandIndex) ?? pref)) score += 4
        if (wantClub && s.venue !== wantClub) score += 2
        score += (timeIndex.get(s.time) ?? 0) * 0.1 + pitchIndex(s) * 0.01
        if (!best || score < best.score) best = { slot: s, score }
      }
      if (!best) {
        unscheduled.push({ week, division: p.fixture.division, homeId: p.fixture.homeId, awayId: p.fixture.awayId, reason: `No free slot in week ${week}: ${placements.length} fixtures, ${slots.length} slots` })
        continue
      }
      used.add(slotKey(best.slot))
      if (!bandVenue.has(p.bandIndex)) bandVenue.set(p.bandIndex, best.slot.venue)
      if (ch) clubVenue.set(ch, best.slot.venue)
      if (ca) clubVenue.set(ca, best.slot.venue)
      fixtures.push({ ...p.fixture, venue: best.slot.venue, pitch: best.slot.pitch, time: best.slot.time })
    }
    const perVenue = new Map<string, number>()
    for (const f of fixtures.filter(f => f.week === week)) perVenue.set(f.venue, (perVenue.get(f.venue) ?? 0) + 1)
    const missing = unscheduled.filter(u => u.week === week).length
    log.push(`Week ${week} (${saturday(setup.firstSaturday, w)}): ${placements.length} fixtures into ${slots.length} slots; ${[...perVenue.entries()].map(([v, n]) => `${v} ${n}`).join(', ')}${missing ? `; ${missing} unscheduled` : ''}`)
  })

  // home/away balance is a property of the pairings, so count placed and unplaced fixtures alike
  const ha = homeAwayCounts([...fixtures, ...unscheduled.map(u => ({ ...u, date: '', time: '', venue: '', pitch: '' }))])
  const counters = countConstraints(fixtures, ha.home, ha.away, repeats, unscheduled.length)
  return { fixtures, unscheduled, counters, log, slotsPerWeek: slots.length, neededPerWeek: weekly.reduce((m, p) => Math.max(m, p.length), 0), byes }
}

/** Independent checks over the produced fixtures (also run by scripts/validate.ts). */
export function countConstraints(fixtures: Fixture[], blockHome: Map<string, number>, blockAway: Map<string, number>, repeats: number, unscheduled: number): Counters {
  const slotUse = new Map<string, number>()
  const teamWeek = new Map<string, number>()
  for (const f of fixtures) {
    const k = `${f.week}|${f.venue}|${f.pitch}|${f.time}`
    slotUse.set(k, (slotUse.get(k) ?? 0) + 1)
    for (const t of [f.homeId, f.awayId]) { const tk = `${f.week}|${t}`; teamWeek.set(tk, (teamWeek.get(tk) ?? 0) + 1) }
  }
  const clashes = [...slotUse.values()].filter(n => n > 1).reduce((a, n) => a + n - 1, 0)
  const teamWeekViolations = [...teamWeek.values()].filter(n => n > 1).reduce((a, n) => a + n - 1, 0)
  let maxGap = 0
  const ids = new Set([...blockHome.keys(), ...blockAway.keys()])
  for (const id of ids) maxGap = Math.max(maxGap, Math.abs((blockHome.get(id) ?? 0) - (blockAway.get(id) ?? 0)))
  return { clashes, repeats, maxHomeAwayGap: maxGap, unscheduled, teamWeekViolations }
}

export function homeAwayCounts(fixtures: Fixture[]): { home: Map<string, number>; away: Map<string, number> } {
  const home = new Map<string, number>(), away = new Map<string, number>()
  for (const f of fixtures) { home.set(f.homeId, (home.get(f.homeId) ?? 0) + 1); away.set(f.awayId, (away.get(f.awayId) ?? 0) + 1) }
  return { home, away }
}
