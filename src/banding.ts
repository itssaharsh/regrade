import type { Band, TeamStats } from './model.ts'

const LETTERS = 'ABCDEFGH'

/** Order by goal difference per game (the number secretaries use), then total goal difference, then id; split as evenly as possible. */
export function proposeBands(stats: TeamStats[], bandCount: number): Band[] {
  const sorted = [...stats].sort((x, y) => y.gdPerGame - x.gdPerGame || y.gd - x.gd || x.teamId.localeCompare(y.teamId))
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

/** Spread in goals per game between the strongest and weakest team of a band (a Kent league aims for about 2.00). */
export function bandSpread(band: Band, stats: Map<string, TeamStats>): number {
  const v = band.teamIds.map(id => stats.get(id)?.gdPerGame ?? 0)
  if (v.length === 0) return 0
  return Math.max(...v) - Math.min(...v)
}

/** How many teams the proposal moves out of the division the results file recorded for them. */
export function movedTeams(bands: Band[], recordedDivision: Map<string, string>): number {
  const byBand = new Map<string, Map<string, number>>()
  for (const b of bands) {
    const counts = new Map<string, number>()
    for (const id of b.teamIds) { const d = recordedDivision.get(id) ?? ''; counts.set(d, (counts.get(d) ?? 0) + 1) }
    byBand.set(b.id, counts)
  }
  // a band "corresponds" to the recorded division most of its teams came from
  let moved = 0
  for (const b of bands) {
    const counts = byBand.get(b.id)!
    const majority = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? ''
    for (const id of b.teamIds) if ((recordedDivision.get(id) ?? '') !== majority) moved++
  }
  return moved
}
