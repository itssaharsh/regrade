// Recount every scheduling rule from an uploader CSV alone: used by validate (Regrade's own export) and by the
// assistant baseline (a general model's answer), so both are judged by exactly the same code.
import type { Setup, Team } from '../src/model.ts'

export interface Recount {
  rows: number; expected: number; clashes: number; teamTwice: number; offSetup: number; repeats: number
  maxGap: number; unknownTeams: string[]; badRows: number; dates: string[]; teamSaturdays: number
}

/** Split one CSV line, respecting double quotes. */
function cells(line: string): string[] {
  const out: string[] = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export function recountCsv(csv: string, teams: Team[], played: Set<string>, setup: Setup, expected: number): Recount {
  const lines = csv.trim().split(/\r?\n/).filter(l => l.trim())
  const idOf = new Map(teams.map(t => [t.name.toLowerCase(), t.id]))
  const setupSlots = new Set(setup.venues.flatMap(v => v.pitches.flatMap(p => setup.times.map(t => `${t}|${v.name}|${p}`))))
  const slotSeen = new Set<string>(), teamDay = new Set<string>(), pairSeen = new Set<string>(), unknown = new Set<string>()
  const home = new Map<string, number>(), away = new Map<string, number>(), dates = new Set<string>()
  let clashes = 0, twice = 0, offSetup = 0, repeats = 0, badRows = 0, rows = 0
  for (const line of lines.slice(1)) {
    const c = cells(line)
    if (c.length < 7 || !/^\d{2}\/\d{2}\/\d{4}$/.test(c[0])) { badRows++; continue }
    const [date, time, , h, a, venue, pitch] = c
    rows++; dates.add(date)
    const slot = `${date}|${time}|${venue}|${pitch}`
    if (slotSeen.has(slot)) clashes++
    slotSeen.add(slot)
    if (!setupSlots.has(`${time}|${venue}|${pitch}`)) offSetup++
    for (const t of [h, a]) { if (teamDay.has(`${date}|${t}`)) twice++; teamDay.add(`${date}|${t}`) }
    const hi = idOf.get(h.toLowerCase()), ai = idOf.get(a.toLowerCase())
    if (!hi) unknown.add(h)
    if (!ai) unknown.add(a)
    if (hi && ai) {
      const [x, y] = [hi, ai].sort()
      if (played.has(`${x}|${y}`) || pairSeen.has(`${x}|${y}`)) repeats++
      pairSeen.add(`${x}|${y}`)
    }
    home.set(h, (home.get(h) ?? 0) + 1); away.set(a, (away.get(a) ?? 0) + 1)
  }
  const maxGap = Math.max(0, ...teams.map(t => Math.abs((home.get(t.name) ?? 0) - (away.get(t.name) ?? 0))))
  return { rows, expected, clashes, teamTwice: twice, offSetup, repeats, maxGap, unknownTeams: [...unknown], badRows, dates: [...dates].sort(), teamSaturdays: teamDay.size }
}
