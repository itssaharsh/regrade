import type { Band, TeamStats } from './model.ts'

const LETTERS = 'ABCDEFGH'

/** How much stronger a division is than the one below it, in goals per game: a Kent league's re-grading target spread (2.00). */
export const DIVISION_GAP = 2

/**
 * Results only come from games inside a division, so +2 in Division 3 is not +2 in Division 1. Each team's goal difference per game
 * counts DIVISION_GAP less per level below the top; with no divisions (level 0 for everyone) this is plain goal difference per game.
 * On the seeded league this places 16 of 48 teams away from their true strength band, against 24 for the league's own guess and
 * 24 for unadjusted goal difference (docs/adr/0004).
 */
export const bandScore = (s: TeamStats, level = 0): number => s.gdPerGame - DIVISION_GAP * level

/** Levels of the recorded divisions: by the number in their names when every name has one (Division 1 is the top), else file order. */
export function divisionLevels(divisionsInFileOrder: string[]): Map<string, number> {
  const names = [...new Set(divisionsInFileOrder.filter(Boolean))]
  const num = (d: string): number => Number(d.match(/\d+/)?.[0] ?? NaN)
  const ordered = names.every(d => !Number.isNaN(num(d))) ? [...names].sort((a, b) => num(a) - num(b)) : names
  return new Map(ordered.map((d, i) => [d, i]))
}

/** Order by adjusted goal difference per game, then total goal difference, then id; split as evenly as possible. */
export function proposeBands(stats: TeamStats[], bandCount: number, levelOf: (teamId: string) => number = () => 0): Band[] {
  const score = new Map(stats.map(s => [s.teamId, bandScore(s, levelOf(s.teamId))]))
  const sorted = [...stats].sort((x, y) => score.get(y.teamId)! - score.get(x.teamId)! || y.gd - x.gd || x.teamId.localeCompare(y.teamId))
  const n = sorted.length
  const bands: Band[] = []
  let start = 0
  for (let b = 0; b < bandCount; b++) {
    const size = Math.floor(n / bandCount) + (b < n % bandCount ? 1 : 0)
    bands.push({ id: `band-${LETTERS[b].toLowerCase()}`, name: `Band ${LETTERS[b]}`, teamIds: sorted.slice(start, start + size).map(s => s.teamId) })
    start += size
  }
  return bands
}

export function moveTeam(bands: Band[], teamId: string, toBandId: string, index?: number): Band[] {
  const from = bands.find(b => b.teamIds.includes(teamId))
  const to = bands.find(b => b.id === toBandId)
  if (!from || !to) return bands
  return bands.map(b => {
    if (b.id === from.id && b.id === to.id) {
      const ids = b.teamIds.filter(id => id !== teamId)
      const at = index === undefined ? ids.length : Math.min(index, ids.length)
      return { ...b, teamIds: [...ids.slice(0, at), teamId, ...ids.slice(at)] }
    }
    if (b.id === from.id) return { ...b, teamIds: b.teamIds.filter(id => id !== teamId) }
    if (b.id === to.id) {
      const at = index === undefined ? b.teamIds.length : Math.min(index, b.teamIds.length)
      return { ...b, teamIds: [...b.teamIds.slice(0, at), teamId, ...b.teamIds.slice(at)] }
    }
    return b
  })
}

/** Spread in (adjusted) goals per game between the strongest and weakest team of a band (a Kent league aims for about 2.00). */
export function bandSpread(band: Band, stats: Map<string, TeamStats>, levelOf: (teamId: string) => number = () => 0): number {
  const v = band.teamIds.map(id => { const s = stats.get(id); return s ? bandScore(s, levelOf(id)) : 0 })
  if (v.length === 0) return 0
  return Math.max(...v) - Math.min(...v)
}

/**
 * Export name for each band: the recorded division most of its teams came from, each division used once (review #22).
 * Bands with no matching division (more bands than divisions, or no Division column) keep their band name.
 */
export function divisionNames(bands: Band[], recordedDivision: Map<string, string>): Map<string, string> {
  const pairs: { band: string; division: string; count: number }[] = []
  for (const b of bands) {
    const counts = new Map<string, number>()
    for (const id of b.teamIds) { const d = recordedDivision.get(id) ?? ''; if (d) counts.set(d, (counts.get(d) ?? 0) + 1) }
    for (const [division, count] of counts) pairs.push({ band: b.id, division, count })
  }
  pairs.sort((x, y) => y.count - x.count || x.band.localeCompare(y.band) || x.division.localeCompare(y.division))
  const out = new Map<string, string>(), usedDiv = new Set<string>()
  for (const p of pairs) if (!out.has(p.band) && !usedDiv.has(p.division)) { out.set(p.band, p.division); usedDiv.add(p.division) }
  for (const b of bands) if (!out.has(b.id)) out.set(b.id, b.name)
  return out
}

/** How many teams the proposal moves out of the division the results file recorded for them. */
export function movedTeams(bands: Band[], recordedDivision: Map<string, string>, names = divisionNames(bands, recordedDivision)): number {
  let moved = 0
  for (const b of bands) for (const id of b.teamIds) { const d = recordedDivision.get(id); if (d && d !== names.get(b.id)) moved++ }
  return moved
}
