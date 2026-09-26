// Deterministic proof: seed -> band -> schedule 4 weeks -> assert -> PASS/FAIL. Runs offline in well under a second.
import { parseResults, computeStats, playedPairs } from '../src/results.ts'
import { proposeBands } from '../src/banding.ts'
import { generateBlock, countConstraints, homeAwayCounts } from '../src/scheduler.ts'
import { toUploaderCsv, UPLOADER_COLUMNS } from '../src/export.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'

let failures = 0
const check = (name: string, ok: boolean, detail = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failures++ }

const parsed = parseResults(sampleResultsCsv().csv)
check('seeded results parse without errors', parsed.errors.length === 0, `${parsed.results.length} results, ${parsed.teams.length} teams`)
const stats = computeStats(parsed.results, parsed.teams)
const played = playedPairs(parsed.results)
const bands = proposeBands([...stats.values()], 3)
check('three bands of sixteen', bands.every(b => b.teamIds.length === 16))

const setup = sampleSetup()
const block = generateBlock(bands, stats, played, parsed.teams, setup)
const ha = homeAwayCounts(block.fixtures)
const independent = countConstraints(block.fixtures, ha.home, ha.away, block.counters.repeats, block.unscheduled.length)
check('96 fixtures placed over 4 weeks', block.fixtures.length === 96, `${block.fixtures.length}`)
check('0 pitch clashes (independent recount)', independent.clashes === 0, `${independent.clashes}`)
check('every team plays once per week', independent.teamWeekViolations === 0)
check('0 repeat pairings against this season', block.counters.repeats === 0, `${block.counters.repeats}`)
check('home/away within 1 for every team', independent.maxHomeAwayGap <= 1, `max gap ${independent.maxHomeAwayGap}`)
check('0 unscheduled with 24 slots', block.unscheduled.length === 0)

const short = sampleSetup(); short.venues[1].pitches = short.venues[1].pitches.slice(0, 2)
const blockShort = generateBlock(bands, stats, played, parsed.teams, short)
check('shortfall is reported, not hidden: 6 unscheduled per week with 18 slots', blockShort.unscheduled.length === 24 && blockShort.fixtures.length === 72, `${blockShort.unscheduled.length} unscheduled, ${blockShort.fixtures.length} placed`)

const name = (id: string) => parsed.teams.find(t => t.id === id)!.name
const csv = toUploaderCsv(block, name)
const lines = csv.trim().split('\r\n')
check('CSV header matches the FA uploader columns', lines[0] === UPLOADER_COLUMNS.join(','))
check('every CSV row has 9 columns and a DD/MM/YYYY date', lines.slice(1).every(l => l.split(',').length === 9 && /^\d{2}\/\d{2}\/\d{4},/.test(l)))
check('block dates are the four Saturdays from the first', new Set(block.fixtures.map(f => f.date)).size === 4 && block.fixtures.every(f => new Date(f.date).getUTCDay() === 6))

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
