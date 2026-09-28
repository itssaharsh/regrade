import type { Block, Fixture, Team } from './model.ts'

/** Column order of the FA Full-Time fixture uploader (Full-Time Fixtures guide v5.1, 2015): confirm against your uploader before use. */
export const UPLOADER_COLUMNS = ['Date', 'Time', 'Division', 'Home Team', 'Away Team', 'Venue', 'Pitch', 'Home Score', 'Away Score'] as const

export const toDdMmYyyy = (iso: string): string => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

// inputs are checked for formula-leading text where they're typed; this is the last line of defence at the file itself
const q = (raw: string): string => { const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function fixtureRow(f: Fixture, name: (id: string) => string): string[] {
  return [toDdMmYyyy(f.date), f.time, f.division, name(f.homeId), name(f.awayId), f.venue, f.pitch, '', '']
}

export function toUploaderCsv(block: Block, name: (id: string) => string): string {
  const rows = [...block.fixtures].sort((a, b) => a.week - b.week || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue) || a.pitch.localeCompare(b.pitch))
  return [UPLOADER_COLUMNS.join(','), ...rows.map(f => fixtureRow(f, name).map(q).join(','))].join('\r\n') + '\r\n'
}

/** One line per team per Saturday for a club: its fixture (home or away, where and when) or its bye. */
export interface ClubLine { club: string; team: string; date: string; time: string; opponent: string; side: 'Home' | 'Away' | 'Bye'; venue: string; pitch: string }

export function clubLines(block: Block, teams: Team[], saturdays: string[]): ClubLine[] {
  const name = (id: string): string => teams.find(t => t.id === id)?.name ?? id
  const out: ClubLine[] = []
  for (const t of [...teams].sort((a, b) => a.club.localeCompare(b.club) || a.name.localeCompare(b.name))) {
    saturdays.forEach((date, w) => {
      const f = block.fixtures.find(x => x.week === w + 1 && (x.homeId === t.id || x.awayId === t.id))
      if (f) out.push({ club: t.club, team: t.name, date: toDdMmYyyy(f.date), time: f.time, opponent: name(f.homeId === t.id ? f.awayId : f.homeId), side: f.homeId === t.id ? 'Home' : 'Away', venue: f.venue, pitch: f.pitch })
      else if (block.byes.some(b => b.week === w + 1 && b.teamId === t.id)) out.push({ club: t.club, team: t.name, date: toDdMmYyyy(date), time: '', opponent: '', side: 'Bye', venue: '', pitch: '' })
    })
  }
  return out
}

export function clubCsv(lines: ClubLine[]): string {
  return ['Club,Team,Date,Time,Opponent,Home/Away,Venue,Pitch', ...lines.map(l => [l.club, l.team, l.date, l.time, l.opponent, l.side, l.venue, l.pitch].map(q).join(','))].join('\r\n') + '\r\n'
}

/** A club's four Saturdays as plain text, ready to paste into an email or a club chat. */
export function clubText(club: string, lines: ClubLine[]): string {
  const mine = lines.filter(l => l.club === club)
  const teams = [...new Set(mine.map(l => l.team))]
  return [`${club}: fixtures`, ...teams.flatMap(t => ['', t, ...mine.filter(l => l.team === t).map(l => l.side === 'Bye'
    ? `  ${l.date}  no game (bye)` : `  ${l.date} ${l.time}  ${l.side === 'Home' ? 'v' : 'at'} ${l.opponent} (${l.side.toLowerCase()}), ${l.venue}, ${l.pitch}`)])].join('\n')
}
