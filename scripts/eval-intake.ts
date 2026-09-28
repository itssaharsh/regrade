// Live eval of the read-results function: golden cases in evals/read-results.jsonl through the real handler and model.
// Saves each raw response to evals/recorded/<id>.json (the sample one also feeds the ?state=read replay).
// Usage: GOOGLE_GENERATIVE_AI_API_KEY=... npx tsx scripts/eval-intake.ts [model[,model]]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { google } from '@ai-sdk/google'
import { handle, MODEL_IDS } from '../api/read-results.ts'
import { resolveName, sourceLines } from '../src/intake.ts'
import { sampleMessage, sampleResultsCsv } from '../src/seed.ts'
import { parseResults } from '../src/results.ts'

// a single model id on the command line measures that model alone; otherwise the production chain (with fallback) is used
const ids = process.argv[2] ? process.argv[2].split(',').map(s => s.trim()) : MODEL_IDS
const modelId = ids.join(',')
const known = parseResults(sampleResultsCsv().csv).teams.map(t => t.name)
const cases = readFileSync('evals/read-results.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l))
mkdirSync('evals/recorded', { recursive: true })
let failed = 0
for (const c of cases) {
  const text = c.input === '@sample' ? sampleMessage() : c.input
  const expect: [string, string, number, number][] = c.input === '@sample'
    ? sampleResultsCsv().nextSaturday.filter(g => !sampleMessage().split('\n').some(l => l.includes('postponed') && l.includes(g.away))).map(g => [g.home, g.away, g.hs, g.as])
    : c.expect
  // like the browser: a busy answer (every model overloaded) is retried twice after a pause; accuracy is what is measured here
  let res: Response, body: any
  for (let attempt = 1; ; attempt++) {
    res = await handle(new Request('http://local/api/read-results', { method: 'POST', body: JSON.stringify({ text }) }),
      { models: ids.map(id => ({ id, model: google(id) })), enabled: true, ip: `eval-${c.id}-${attempt}`, perTryMs: 45_000, budgetMs: 120_000 })
    body = await res.json()
    if (res.ok || !body.busy || attempt === 3) break
    await new Promise(r => setTimeout(r, 5000 * attempt))
  }
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
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.id} [${body.model}${body.tried?.length ? ` after ${body.tried.map((t: { model: string; error: string }) => `${t.model} ${t.error}`).join(', ')}` : ''}]: ${got.length}/${want.length} rows, ${body.rejected.length} rejected, ${body.skipped.length} skipped, ${body.ms} ms${missing.length ? ` | missing ${missing.join('; ')}` : ''}${extra.length ? ` | extra ${extra.join('; ')}` : ''}${skipOk ? '' : ' | expected a skipped line'}`)
}
console.log(failed ? `\n${failed} FAILED (${modelId})` : `\nALL PASS (${modelId}, ${cases.length} cases)`)
process.exit(failed ? 1 : 0)
