import type { Setup, Team } from './model.ts'
import { circleRounds, BYE } from './scheduler.ts'
import { slug } from './results.ts'
import { toDdMmYyyy } from './export.ts'

/** Deterministic PRNG (mulberry32) so the fictional league is identical on every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const CLUBS = ['Oakford Colts', 'Ashby Lions', 'Hartwell Rovers', 'Brindley Youth', 'Fenwick Falcons', 'Sedgemoor Saints', 'Kingsley Juniors', 'Elmbridge Eagles',
  'Westcombe Wanderers', 'Netherfield Athletic', 'Padley Park', 'Ravenhill Rangers', 'Stonebridge United', 'Caldicott Cubs', 'Marlfield Green', 'Dunmore Dynamos',
  'Ferncliffe', 'Hazelwood Hornets', 'Ivybrook', 'Lynford Youth', 'Norcott Town', 'Quenby Colts', 'Redmoor', 'Silverbeck']
const PAIRS: [string, string][] = [['Reds', 'Blues'], ['Whites', 'Blacks'], ['Greens', 'Golds'], ['Lions', 'Tigers'], ['Hawks', 'Eagles'], ['Stars', 'Comets']]

export const SAMPLE_LEAGUE = 'Oakford & District Youth League, U9 (fictional league, synthetic results)'

export function sampleSetup(): Setup {
  return {
    venues: [{ name: 'Oakford Leisure Centre', pitches: ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4'] }, { name: 'Ashby Playing Fields', pitches: ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4'] }],
    times: ['09:00', '10:00', '11:00'],
    weeks: 4,
    firstSaturday: '2026-10-17',
  }
}

function poisson(rand: () => number, lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rand() } while (p > L)
  return k - 1
}

/** 48 teams, 6 Saturdays of results in the league's guessed divisions; about a third of teams were guessed into the wrong division. */
export function sampleResultsCsv(seed = 20261017): { csv: string; teams: Team[]; strengths: Map<string, number> } {
  const rand = mulberry32(seed)
  const teams: Team[] = []
  const strengths = new Map<string, number>()
  CLUBS.forEach((club, ci) => {
    const base = (rand() - 0.5) * 2.0
    const [c1, c2] = PAIRS[ci % PAIRS.length]
    for (const colour of [c1, c2]) {
      const name = `${club} ${colour}`
      const id = slug(name)
      teams.push({ id, name, club })
      strengths.set(id, base + (rand() - 0.5) * 1.2)
    }
  })
  // the league's pre-season guess: strength plus noise, then thirds
  const guessed = [...teams].sort((a, b) => (strengths.get(b.id)! + (rand() - 0.5) * 1.6) - (strengths.get(a.id)! + (rand() - 0.5) * 1.6))
  const divisions: Team[][] = [guessed.slice(0, 16), guessed.slice(16, 32), guessed.slice(32, 48)]
  const setup = sampleSetup()
  const rows: string[] = ['Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score']
  const first = new Date('2026-09-05T00:00:00Z')
  divisions.forEach((div, di) => {
    const rounds = circleRounds(div.map(t => t.id))
    for (let w = 0; w < 6; w++) {
      const date = new Date(first); date.setUTCDate(date.getUTCDate() + 7 * w)
      const iso = date.toISOString().slice(0, 10)
      rounds[w].forEach(([a, b], pi) => {
        if (a === BYE || b === BYE) return
        const [home, away] = w % 2 === 0 ? [a, b] : [b, a]
        const diff = strengths.get(home)! - strengths.get(away)!
        const hs = poisson(rand, Math.min(5, Math.max(0.3, 2.2 + 0.9 * diff)))
        const as = poisson(rand, Math.min(5, Math.max(0.3, 2.0 - 0.9 * diff)))
        const venue = setup.venues[(di + w) % 2]
        const time = setup.times[Math.floor(pi / 4) % 3]
        const pitch = venue.pitches[pi % 4]
        const nm = (id: string) => teams.find(t => t.id === id)!.name
        rows.push([toDdMmYyyy(iso), time, `Division ${di + 1}`, nm(home), nm(away), venue.name, pitch, String(hs), String(as)].join(','))
      })
    }
  })
  return { csv: rows.join('\n') + '\n', teams, strengths }
}
