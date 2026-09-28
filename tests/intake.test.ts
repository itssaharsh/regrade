import { describe, expect, it } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import { groundingProblem, checkOutput, resolveName, completeDate, checkInput, sourceLines, MAX_CHARS, type ReadOutput, type ReadRow } from '../src/intake.ts'
import { handle, rateLimited } from '../api/read-results.ts'
import { sampleMessage, sampleResultsCsv } from '../src/seed.ts'
import { parseResults } from '../src/results.ts'

const TEXT = ['U9 results, Sat 17 Oct', 'Division 1:', 'Oakford Reds 3 Ashby Lions Blues 1', 'Hartwell Rovers Whites v Brindley Youth Blacks 2-2', 'Redmoor Eagles v Silverbeck Stars postponed'].join('\n')
const row = (r: Partial<ReadRow>): ReadRow => ({ line: 3, home: 'Oakford Reds', away: 'Ashby Lions Blues', homeScore: 3, awayScore: 1, ...r })

describe('grounding: a row is kept only if its line really says it', () => {
  const lines = sourceLines(TEXT)
  it('accepts names and scores that are in the cited line', () => {
    expect(groundingProblem(row({}), lines)).toBeNull()
    expect(groundingProblem(row({ line: 4, home: 'Hartwell Rovers Whites', away: 'Brindley Youth Blacks', homeScore: 2, awayScore: 2 }), lines)).toBeNull()
  })
  it('rejects an invented team, a wrong score, a wrong line and a team playing itself', () => {
    expect(groundingProblem(row({ home: 'Oakford Colts Reds' }), lines)).toMatch(/not in line 3/)
    expect(groundingProblem(row({ homeScore: 4 }), lines)).toMatch(/score 4/)
    expect(groundingProblem(row({ line: 4 }), lines)).toMatch(/not in line 4/)
    expect(groundingProblem(row({ line: 99 }), lines)).toMatch(/does not exist/)
    expect(groundingProblem(row({ away: 'Oakford Reds' }), lines)).toMatch(/same/)
  })
  it('needs two separate numbers for a 3-3 when the line has only one 3', () => {
    expect(groundingProblem(row({ homeScore: 3, awayScore: 3 }), lines)).toMatch(/score 3/)
  })
  it('drops a division that is nowhere in the text and a date in the wrong shape, keeps the row', () => {
    const out = checkOutput({ rows: [row({ division: 'Premier', date: 'next week' }), row({ line: 4, home: 'Hartwell Rovers Whites', away: 'Brindley Youth Blacks', homeScore: 2, awayScore: 2, division: 'Division 1', date: '17/10' })], skipped: [] }, TEXT)
    expect(out.rows[0]).not.toHaveProperty('division'); expect(out.rows[0]).not.toHaveProperty('date')
    expect(out.rows[1]).toMatchObject({ division: 'Division 1', date: '17/10' })
  })
  it('lists a line read twice once, and keeps skipped lines that exist', () => {
    const out = checkOutput({ rows: [row({}), row({})], skipped: [{ line: 5, reason: 'postponed' }, { line: 40, reason: 'x' }] }, TEXT)
    expect(out.rows).toHaveLength(1); expect(out.rejected[0].reason).toMatch(/twice/); expect(out.skipped).toEqual([{ line: 5, reason: 'postponed' }])
  })
})

describe('names: short forms match a known team only when exactly one fits', () => {
  const known = ['Oakford Colts Reds', 'Oakford Colts Blues', 'Ashby Lions Blues', 'Ashby Lions Blacks']
  it('exact, matched, new and ambiguous', () => {
    expect(resolveName('ashby lions blues', known)).toEqual({ name: 'Ashby Lions Blues', how: 'exact' })
    expect(resolveName('Oakford Reds', known)).toEqual({ name: 'Oakford Colts Reds', how: 'matched' })
    expect(resolveName('Ivybrok Blues', known).how).toBe('new')
    expect(resolveName('Oakford Colts', known)).toMatchObject({ how: 'ambiguous', candidates: ['Oakford Colts Reds', 'Oakford Colts Blues'] })
  })
  it('completes a date without a year from the latest results', () => {
    expect(completeDate('17/10', 2026)).toBe('17/10/2026'); expect(completeDate('7/9/2025', 2026)).toBe('07/09/2025'); expect(completeDate(undefined, 2026)).toBe('')
  })
})

describe('the sample message (fictional) can be read completely', () => {
  it('every game line grounds and every short name matches exactly one sample team', () => {
    const text = sampleMessage(); const lines = sourceLines(text)
    const known = parseResults(sampleResultsCsv().csv).teams.map(t => t.name)
    const games = sampleResultsCsv().nextSaturday
    let found = 0
    lines.forEach((l, i) => {
      const g = games.find(g => (l.includes(g.away)) && /\d/.test(l) && !/postponed/.test(l))
      if (!g) return
      const home = l.slice(0, l.search(/ v | \d| beat /)).trim()
      expect(groundingProblem({ line: i + 1, home, away: g.away, homeScore: g.hs, awayScore: g.as }, lines)).toBeNull()
      expect(resolveName(home, known).name).toBe(g.home)
      found++
    })
    expect(found).toBe(games.length - 1) // one game is reported as postponed
  })
})

const mock = (output: ReadOutput | string) => new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } },
    warnings: [],
  }),
})
const req = (body: unknown) => new Request('http://x/api/read-results', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } })
let ipN = 0
const deps = (model: ReturnType<typeof mock>, over: Partial<{ enabled: boolean; ip: string }> = {}) => ({ model, modelId: 'mock', enabled: true, ip: `10.0.0.${++ipN}`, ...over })

describe('the read-results function', () => {
  it('returns grounded rows and lists the invented one', async () => {
    const res = await handle(req({ text: TEXT }), deps(mock({ rows: [row({}), row({ line: 4, home: 'Made Up FC', away: 'Brindley Youth Blacks', homeScore: 2, awayScore: 2 })], skipped: [{ line: 5, reason: 'postponed' }] })))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1); expect(body.rejected[0].reason).toMatch(/Made Up FC/); expect(body.skipped[0].reason).toBe('postponed')
  })
  it('is off when switched off or without a key', async () => {
    expect((await handle(req({ text: TEXT }), deps(mock({ rows: [], skipped: [] }), { enabled: false }))).status).toBe(503)
  })
  it('refuses empty, oversized and non-JSON input without calling the model', async () => {
    const m = mock({ rows: [], skipped: [] })
    expect((await handle(req({ text: '  ' }), deps(m))).status).toBe(400)
    expect((await handle(req({ text: 'x'.repeat(MAX_CHARS + 1) }), deps(m))).status).toBe(400)
    expect((await handle(req('not json'), deps(m))).status).toBe(400)
    expect(m.doGenerateCalls).toHaveLength(0)
    expect(checkInput(Array(200).fill('a v b 1-0').join('\n'))).toMatch(/200 lines/)
  })
  it('answers malformed model output with a typed error, not a crash', async () => {
    const res = await handle(req({ text: TEXT }), deps(mock('{"rows": [ {"line": "three"')))
    expect(res.status).toBe(502); expect((await res.json()).error).toBe('model_error')
  })
  it('limits each address to 6 reads a minute', () => {
    const t = 1_000_000
    for (let i = 0; i < 6; i++) expect(rateLimited('9.9.9.9', t + i)).toBeNull()
    expect(rateLimited('9.9.9.9', t + 10)).toBeGreaterThan(0)
    expect(rateLimited('9.9.9.9', t + 61_000)).toBeNull()
  })
})
