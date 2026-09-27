import type { Result, Team, TeamStats } from './model.ts'
import { pairKey } from './model.ts'

export interface ParseError { row: number; message: string }
export interface Parsed { results: Result[]; errors: ParseError[]; teams: Team[] }

const COLOURS = new Set(['reds', 'blues', 'whites', 'blacks', 'greens', 'golds', 'lions', 'tigers', 'hawks', 'eagles', 'stars', 'comets', 'a', 'b', 'c', 'red', 'blue', 'white', 'black', 'green', 'gold', 'yellow', 'yellows', 'amber', 'ambers'])

/** Team id from its name; letters in any script survive, so non-Latin names don't collapse to one id (accents are folded). */
export const slug = (name: string): string => name.trim().normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '')

export function clubOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length > 1 && COLOURS.has(parts[parts.length - 1].toLowerCase())) return parts.slice(0, -1).join(' ')
  return name.trim()
}

/** Minimal CSV line splitter that respects double quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') inQ = false; else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

/** Accepts the FA uploader layout with scores filled in (Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score)
 *  or a simple table (Date,Home,Away,Home Score,Away Score). Dates may be DD/MM/YYYY or YYYY-MM-DD. */
/** A cell starting with one of these would run as a formula when the CSV is opened in a spreadsheet. */
export const FORMULA_START = /^[=+\-@\t\r]/

export function parseResults(text: string): Parsed {
  // cells are trimmed after the split; trimming whole lines would drop a leading empty tab-separated cell and shift the columns
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const results: Result[] = []
  const errors: ParseError[] = []
  const teamMap = new Map<string, Team>()
  const seen = new Map<string, number>()
  if (lines.length === 0) return { results, errors: [{ row: 0, message: 'No rows found' }], teams: [] }
  const split = lines[0].includes('\t') ? (l: string): string[] => l.split('\t').map(c => c.trim()) : splitCsvLine
  const header = split(lines[0]).map(h => h.toLowerCase())
  const col = (names: string[]): number => names.map(n => header.indexOf(n)).find(i => i >= 0) ?? -1
  const iDate = col(['date']), iDiv = col(['division', 'div']), iHome = col(['home team', 'home']), iAway = col(['away team', 'away'])
  const iHS = col(['home score', 'hs', 'home goals']), iAS = col(['away score', 'as', 'away goals'])
  if (iHome < 0 || iAway < 0 || iHS < 0 || iAS < 0) {
    return { results, errors: [{ row: 1, message: 'Header must name Home Team, Away Team, Home Score and Away Score' }], teams: [] }
  }
  for (let r = 1; r < lines.length; r++) {
    const cells = split(lines[r])
    const home = cells[iHome] ?? '', away = cells[iAway] ?? ''
    if (!home || !away) { errors.push({ row: r + 1, message: `Row ${r + 1}: team name missing` }); continue }
    const division = iDiv >= 0 ? cells[iDiv] ?? '' : ''
    const formula = [home, away, division].find(n => FORMULA_START.test(n))
    if (formula) { errors.push({ row: r + 1, message: `Row ${r + 1}: "${formula}" starts with =, +, - or @ and would run as a spreadsheet formula` }); continue }
    if (slug(home) === slug(away)) { errors.push({ row: r + 1, message: `Row ${r + 1}: a team can't play itself (${home})` }); continue }
    const hs = cells[iHS] ?? '', as = cells[iAS] ?? ''
    if (hs === '' || as === '') { errors.push({ row: r + 1, message: `Row ${r + 1}: score missing (${home} vs ${away})` }); continue }
    if (!/^\d{1,2}$/.test(hs) || !/^\d{1,2}$/.test(as)) {
      errors.push({ row: r + 1, message: `Row ${r + 1}: scores must be whole numbers from 0 to 99 (${home} ${hs}–${as} ${away})` }); continue
    }
    const date = normaliseDate(iDate >= 0 ? cells[iDate] ?? '' : '')
    // the same dated fixture pasted twice would count its goals twice; without a date a repeat may be a real rematch
    const key = `${date}|${slug(home)}|${slug(away)}`
    if (date && seen.has(key)) { errors.push({ row: r + 1, message: `Row ${r + 1}: duplicate of row ${seen.get(key)} (${home} v ${away}, ${cells[iDate]})` }); continue }
    seen.set(key, r + 1)
    results.push({ date, division, home, away, homeScore: Number(hs), awayScore: Number(as) })
    for (const name of [home, away]) {
      const id = slug(name)
      if (!teamMap.has(id)) teamMap.set(id, { id, name, club: clubOf(name) })
    }
  }
  return { results, errors, teams: [...teamMap.values()].sort((a, b) => a.name.localeCompare(b.name)) }
}

/** The division each team's results were recorded in (the last one seen, if a team appears in more than one). */
export function recordedDivisions(results: Result[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const r of results) { out.set(slug(r.home), r.division); out.set(slug(r.away), r.division) }
  return out
}

export function normaliseDate(s: string): string {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return s
}

export function computeStats(results: Result[], teams: Team[]): Map<string, TeamStats> {
  const stats = new Map<string, TeamStats>()
  for (const t of teams) stats.set(t.id, { teamId: t.id, played: 0, gf: 0, ga: 0, gd: 0, gdPerGame: 0, homeGames: 0, awayGames: 0 })
  for (const r of results) {
    const h = stats.get(slug(r.home)), a = stats.get(slug(r.away))
    if (!h || !a) continue
    h.played++; a.played++; h.homeGames++; a.awayGames++
    h.gf += r.homeScore; h.ga += r.awayScore; a.gf += r.awayScore; a.ga += r.homeScore
  }
  for (const s of stats.values()) { s.gd = s.gf - s.ga; s.gdPerGame = s.played ? s.gd / s.played : 0 }
  return stats
}

export function playedPairs(results: Result[]): Set<string> {
  const set = new Set<string>()
  for (const r of results) set.add(pairKey(slug(r.home), slug(r.away)))
  return set
}
