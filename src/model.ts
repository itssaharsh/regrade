export interface Team { id: string; name: string; club: string }
export interface Result { date: string; division: string; home: string; away: string; homeScore: number; awayScore: number }
export interface TeamStats { teamId: string; played: number; gf: number; ga: number; gd: number; gdPerGame: number; homeGames: number; awayGames: number }
export interface Band { id: string; name: string; teamIds: string[] }
export interface Venue { name: string; pitches: string[] }
export interface Slot { venue: string; pitch: string; time: string }
export interface Fixture { week: number; date: string; time: string; division: string; homeId: string; awayId: string; venue: string; pitch: string }
export interface Unscheduled { week: number; division: string; homeId: string; awayId: string; reason: string }
export interface Counters { clashes: number; repeats: number; maxHomeAwayGap: number; unscheduled: number; teamWeekViolations: number }
export interface Block { fixtures: Fixture[]; unscheduled: Unscheduled[]; counters: Counters; log: string[]; slotsPerWeek: number; neededPerWeek: number; byes: { week: number; teamId: string }[] }
export interface Setup { venues: Venue[]; times: string[]; weeks: number; firstSaturday: string }
export const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)
export const slotKey = (s: Slot): string => `${s.venue}|${s.pitch}|${s.time}`
