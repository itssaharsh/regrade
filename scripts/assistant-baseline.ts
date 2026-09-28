// The same job given to a general model in one prompt (no tools): the sample's results and slots in, four weeks of fixtures out.
// Its CSV is judged by scripts/recount.ts, the same rules validate applies to Regrade's own export. Whatever it scores is reported.
// Usage: node --env-file=.env.local --experimental-strip-types scripts/assistant-baseline.ts [model]
import { writeFileSync, mkdirSync } from 'node:fs'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { parseResults, playedPairs } from '../src/results.ts'
import { sampleResultsCsv, sampleSetup } from '../src/seed.ts'
import { saturday } from '../src/scheduler.ts'
import { recountCsv } from './recount.ts'

const modelId = process.argv[2] ?? process.env.REGRADE_BASELINE_MODEL ?? 'gemini-3.1-pro-preview'
const { csv } = sampleResultsCsv()
const parsed = parseResults(csv)
const setup = sampleSetup()
const dates = Array.from({ length: setup.weeks }, (_, w) => saturday(setup.firstSaturday, w)).map(d => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`)

const prompt = `You are helping the volunteer fixtures secretary of a youth football league. Below are this season's results as CSV (48 teams in 3 divisions).

Do two things:
1. Re-band the 48 teams into 3 divisions of 16 by their results.
2. Produce the next ${setup.weeks} Saturdays of fixtures (${dates.join(', ')}), each fixture between two teams of the same new division, so that:
   - every team plays exactly once each Saturday;
   - no pairing has already been played this season (see the results), and no pairing appears twice in the ${setup.weeks} weeks;
   - over the ${setup.weeks} weeks, each team's home games and away games differ by at most one;
   - each Saturday uses only these slots, one fixture per venue, pitch and time: venues ${setup.venues.map(v => `"${v.name}" (${v.pitches.join(', ')})`).join(' and ')}; kick-off times ${setup.times.join(', ')}.

Output only the FA Full-Time uploader CSV, with this header and ${48 / 2 * setup.weeks} rows, dates as DD/MM/YYYY, scores left blank, no commentary:
Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score

Results:
${csv}`

const t0 = Date.now()
const { text, usage } = await generateText({ model: google(modelId), prompt, maxRetries: 1, abortSignal: AbortSignal.timeout(600_000) })
const ms = Date.now() - t0
const answer = text.replace(/^```[a-z]*\n?/im, '').replace(/```\s*$/m, '').trim()
const rc = recountCsv(answer, parsed.teams, playedPairs(parsed.results), setup, 48 / 2 * setup.weeks)
const out = { model: modelId, date: new Date().toISOString(), ms, usage, tools: 'none (one prompt)', recount: rc }
mkdirSync('evals/baseline', { recursive: true })
const stem = `evals/baseline/${modelId.replace(/[^a-z0-9.-]/gi, '_')}`
writeFileSync(`${stem}.prompt.txt`, prompt)
writeFileSync(`${stem}.output.csv`, answer + '\n')
writeFileSync(`${stem}.json`, JSON.stringify(out, null, 2) + '\n')
console.log(JSON.stringify({ model: modelId, seconds: Math.round(ms / 1000), ...rc, unknownTeams: rc.unknownTeams.slice(0, 5) }, null, 1))
