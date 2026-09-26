import type { Block, Fixture } from './model.ts'

/** Column order of the FA Full-Time fixture uploader (Full-Time Fixtures guide v5.1, 2015): confirm against your uploader before use. */
export const UPLOADER_COLUMNS = ['Date', 'Time', 'Division', 'Home Team', 'Away Team', 'Venue', 'Pitch', 'Home Score', 'Away Score'] as const

export const toDdMmYyyy = (iso: string): string => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

const q = (s: string): string => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function fixtureRow(f: Fixture, name: (id: string) => string): string[] {
  return [toDdMmYyyy(f.date), f.time, f.division, name(f.homeId), name(f.awayId), f.venue, f.pitch, '', '']
}

export function toUploaderCsv(block: Block, name: (id: string) => string): string {
  const rows = [...block.fixtures].sort((a, b) => a.week - b.week || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue) || a.pitch.localeCompare(b.pitch))
  return [UPLOADER_COLUMNS.join(','), ...rows.map(f => fixtureRow(f, name).map(q).join(','))].join('\r\n') + '\r\n'
}
