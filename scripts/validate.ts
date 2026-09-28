// Deterministic proof: seed -> band -> schedule 4 weeks -> assert -> PASS/FAIL. Runs offline in well under a second.
import { parseResults, computeStats, playedPairs, recordedDivisions } from '../src/results.ts'
import { proposeBands, divisionLevels } from '../src/banding.ts'
import { generateBlock } from '../src/scheduler.ts'
import { toUploaderCsv, UPLOADER_COLUMNS } from '../src/export.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'
import { recountCsv } from './recount.ts'

let failures = 0
const check = (name: string, ok: boolean, detail = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failures++ }

const parsed = parseResults(sampleResultsCsv().csv)
check('seeded results parse without errors', parsed.errors.length === 0, `${parsed.results.length} results, ${parsed.teams.length} teams`)
const stats = computeStats(parsed.results, parsed.teams)
const played = playedPairs(parsed.results)
const recorded = recordedDivisions(parsed.results)
const levels = divisionLevels(parsed.results.map(r => r.division))
const bands = proposeBands([...stats.values()], 3, id => levels.get(recorded.get(id) ?? '') ?? 0)
check('three bands of sixteen', bands.every(b => b.teamIds.length === 16))
// the seed knows each team's true strength: the bands must place fewer teams away from their true third than the league's guess did
const { strengths } = sampleResultsCsv()
const trueBand = new Map([...strengths.entries()].sort((a, b) => b[1] - a[1]).map(([id], i) => [id, Math.floor(i / 16)]))
const wrongBands = bands.flatMap((b, bi) => b.teamIds.filter(id => trueBand.get(id) !== bi)).length
const wrongGuess = [...recorded].filter(([id, d]) => levels.get(d) !== trueBand.get(id)).length
check("bands beat the league's own guess against the sample's hidden strengths", wrongBands < wrongGuess, `${wrongBands} vs ${wrongGuess} of 48 teams away from their true band`)

const setup = sampleSetup()
const block = generateBlock(bands, stats, played, parsed.teams, setup)
check('96 fixtures placed over 4 weeks', block.fixtures.length === 96, `${block.fixtures.length}`)
check('0 unscheduled with 24 slots', block.unscheduled.length === 0)

// Independent recount: read the exported CSV itself (the file a secretary uploads) and recount every constraint from its rows,
// without calling the scheduler's own counters, so a bug in countConstraints can't hide a bug in the scheduler.
const name = (id: string) => parsed.teams.find(t => t.id === id)!.name
const csv = toUploaderCsv(block, name)
const lines = csv.trim().split('\r\n')
check('CSV header matches the FA uploader columns', lines[0] === UPLOADER_COLUMNS.join(','))
check('every CSV row has 9 columns and a DD/MM/YYYY date', lines.slice(1).every(l => l.split(',').length === 9 && /^\d{2}\/\d{2}\/\d{4},/.test(l)))
const rc = recountCsv(csv, parsed.teams, played, setup, 96)
check('0 pitch clashes (recounted from the exported CSV)', rc.clashes === 0, `${rc.clashes}`)
check('every fixture is in a slot from the setup', rc.offSetup === 0, `${rc.offSetup} outside`)
check('every team plays once per Saturday (recounted from the CSV)', rc.teamTwice === 0 && rc.teamSaturdays === 48 * 4, `${rc.teamSaturdays} team-Saturdays`)
check('0 repeat pairings (recounted from the CSV against the results)', rc.repeats === 0, `${rc.repeats}`)
check('home/away within 1 for every team (recounted from the CSV)', rc.maxGap <= 1, `max gap ${rc.maxGap}`)
check('on-screen counters agree with the recount', block.counters.clashes === rc.clashes && block.counters.repeats === rc.repeats && block.counters.maxHomeAwayGap === rc.maxGap)
check('block dates are the four Saturdays from the first', new Set(block.fixtures.map(f => f.date)).size === 4 && block.fixtures.every(f => new Date(f.date).getUTCDay() === 6))

const short = sampleSetup(); short.venues[1].pitches = short.venues[1].pitches.slice(0, 2)
const blockShort = generateBlock(bands, stats, played, parsed.teams, short)
check('shortfall is reported, not hidden: 6 unscheduled per week with 18 slots', blockShort.unscheduled.length === 24 && blockShort.fixtures.length === 72, `${blockShort.unscheduled.length} unscheduled, ${blockShort.fixtures.length} placed`)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
