// Live eval of the read-results function: golden cases in evals/read-results.jsonl through the real handler and model.
// Saves each raw response to evals/recorded/<id>.json (the sample one also feeds the ?state=read replay).
// Usage: node --env-file=.env.local --experimental-strip-types scripts/eval-intake.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { google } from '@ai-sdk/google'
import { handle } from '../api/read-results.ts'
import { resolveName, sourceLines } from '../src/intake.ts'
import { sampleMessage, sampleResultsCsv } from '../src/seed.ts'
import { parseResults } from '../src/results.ts'

const modelId = process.env.REGRADE_MODEL ?? 'gemini-3.8-flash'
const known = parseResults(sampleResultsCsv().csv).teams.map(t => t.name)
const cases = readFileSync('evals/read-results.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l))
mkdirSync('evals/recorded', { recursive: true })
let failed = 0
for (const c of cases) {
  const text = c.input === '@sample' ? sampleMessage() : c.input
  const expect: [string, string, number, number][] = c.input === '@sample'
    ? sampleResultsCsv().nextSaturday.filter(g => !sampleMessage().split('\n').some(l => l.includes('postponed') && l.includes(g.away))).map(g => [g.home, g.away, g.hs, g.as])
    : c.expect
  const res = await handle(new Request('http://local/api/read-results', { method: 'POST', body: JSON.stringify({ text }) }),
    { model: google(modelId), modelId, enabled: true, ip: `eval-${c.id}` })
  const body = await res.json()
  writeFileSync(`evals/recorded/${c.id}.json`, JSON.stringify({ case: c.id, recordedAt: new Date().toISOString(), status: res.status, ...body }, null, 2) + '\n')
  if (res.status !== 200) { failed++; console.log(`FAIL ${c.id}: HTTP ${res.status} ${body.message}`); continue }
  const got = body.rows.map((r: { home: string; away: string; homeScore: number; awayScore: number }) =>
    [resolveName(r.home, known).name, resolveName(r.away, known).name, r.homeScore, r.awayScore].join('|'))
  const want = expect.map(e => e.join('|'))
  const missing = want.filter(w => !got.includes(w)), extra = got.filter((g: string) => !want.includes(g))
  const lines = sourceLines(text)
  const skipOk = !c.must_skip_lines_matching || body.skipped.some((s: { line: number }) => new RegExp(c.must_skip_lines_matching).test(lines[s.line - 1] ?? ''))
  const ok = missing.length === 0 && extra.length === 0 && skipOk
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.id}: ${got.length}/${want.length} rows, ${body.rejected.length} rejected, ${body.skipped.length} skipped, ${body.ms} ms${missing.length ? ` | missing ${missing.join('; ')}` : ''}${extra.length ? ` | extra ${extra.join('; ')}` : ''}${skipOk ? '' : ' | expected a skipped line'}`)
}
console.log(failed ? `\n${failed} FAILED (${modelId})` : `\nALL PASS (${modelId}, ${cases.length} cases)`)
process.exit(failed ? 1 : 0)
