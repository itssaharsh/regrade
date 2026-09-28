// POST /api/read-results {text}: one structured-output call reads results written any way; code keeps only grounded rows.
// GET /api/read-results: whether reading is available here (the browser hides the button when it isn't).
import { generateText, Output, type LanguageModel } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { SYSTEM, MAX_LINES, numberLines, checkInput, checkOutput, type ReadOutput } from '../src/intake.js'

export const maxDuration = 30
// tried in order: Gemini models are often briefly overloaded (HTTP 503), so a busy model hands over to the next one
export const MODEL_IDS = (process.env.REGRADE_MODELS ?? 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.7-flash').split(',').map(s => s.trim()).filter(Boolean)
const BUDGET_MS = 26_000, PER_TRY_MS = 12_000, ROUNDS = 2, PAUSE_MS = 1_500
const PER_MINUTE = 6, PER_DAY = 40

// no array limits in the schema: Gemini rejects them (HTTP 400); the input cap bounds the output and code trims any excess
const schema = z.object({
  rows: z.array(z.object({
    line: z.number().int(), home: z.string(), away: z.string(), homeScore: z.number().int(), awayScore: z.number().int(),
    division: z.string().optional(), date: z.string().optional(),
  })),
  skipped: z.array(z.object({ line: z.number().int(), reason: z.string() })),
})

// per-instance limits: cheap abuse protection for a demo; a busy product would use a shared store or the Vercel firewall
const hits = new Map<string, number[]>()
export function rateLimited(ip: string, now = Date.now()): number | null {
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 86_400_000)
  const lastMinute = recent.filter(t => now - t < 60_000)
  if (lastMinute.length >= PER_MINUTE) return Math.ceil((60_000 - (now - lastMinute[0])) / 1000)
  if (recent.length >= PER_DAY) return 3600
  recent.push(now); hits.set(ip, recent)
  return null
}

export const enabled = (): boolean => process.env.AI_ENABLED !== 'false' && !!process.env.GOOGLE_GENERATIVE_AI_API_KEY

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } })

export interface Deps { models: { id: string; model: LanguageModel }[]; enabled: boolean; ip: string; perTryMs?: number; budgetMs?: number; rounds?: number; pauseMs?: number }

export async function handle(request: Request, deps: Deps): Promise<Response> {
  if (!deps.enabled) return json({ error: 'unavailable', message: 'Reading results with AI is switched off here.' }, 503)
  let body: unknown
  try { body = await request.json() } catch { return json({ error: 'bad_request', message: 'Send JSON: {"text": "..."}' }, 400) }
  const text = (body as { text?: unknown })?.text
  const problem = checkInput(text)
  if (problem) return json({ error: 'bad_input', message: problem }, 400)
  const wait = rateLimited(deps.ip)
  if (wait !== null) return json({ error: 'rate_limited', message: `Too many reads from here; try again in ${wait} s.`, retryAfter: wait }, 429, { 'retry-after': String(wait) })
  const t0 = Date.now(), budget = deps.budgetMs ?? BUDGET_MS
  const tried: { model: string; error: string }[] = []
  // overload is usually brief: try every model, pause, then try them all again while the budget lasts
  const attempts = Array.from({ length: deps.rounds ?? ROUNDS }, (_, r) => deps.models.map(m => ({ ...m, round: r }))).flat()
  for (const [i, { id, model, round }] of attempts.entries()) {
    if (i > 0 && round !== attempts[i - 1].round) await new Promise(r => setTimeout(r, deps.pauseMs ?? PAUSE_MS))
    const left = budget - (Date.now() - t0)
    if (left < 2_000) break
    try {
      const { output } = await generateText({
        model,
        system: SYSTEM,
        prompt: numberLines(text as string),
        output: Output.object({ schema }),
        temperature: 0,
        maxOutputTokens: 6000,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(Math.min(left, deps.perTryMs ?? PER_TRY_MS)),
      })
      const raw = output as ReadOutput
      const checked = checkOutput({ rows: (raw.rows ?? []).slice(0, MAX_LINES), skipped: (raw.skipped ?? []).slice(0, MAX_LINES) }, text as string)
      return json({ ...checked, model: id, ms: Date.now() - t0, tried })
    } catch (e) {
      const err = e as Error & { statusCode?: number }
      const kind = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : err.statusCode ? `HTTP ${err.statusCode}` : err.name
      tried.push({ model: id, error: kind, ...(round ? { round: round + 1 } : {}) })
      // the message is logged without the pasted text (content capture off)
      console.error('read-results attempt failed', id, kind, String(err.message ?? '').slice(0, 160))
    }
  }
  const timedOut = tried.length > 0 && tried.every(t => t.error === 'timeout')
  const busy = tried.length > 0 && tried.every(t => t.error === 'HTTP 503' || t.error === 'HTTP 429' || t.error === 'timeout')
  return json({ error: timedOut ? 'timeout' : 'model_error', busy, tried,
    message: timedOut ? 'Reading took too long. Try fewer lines.'
      : tried.every(t => t.error === 'HTTP 503' || t.error === 'HTTP 429') ? 'Gemini is busy right now (Google reports high demand). Your text is kept; try again in a minute.'
      : 'The model could not read that. Try again, or paste a results table.' }, timedOut ? 504 : 502)
}

const clientIp = (r: Request): string => r.headers.get('x-real-ip') ?? r.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

export function GET(): Response {
  return json({ enabled: enabled(), models: enabled() ? MODEL_IDS : [] })
}

export function POST(request: Request): Promise<Response> {
  return handle(request, { models: MODEL_IDS.map(id => ({ id, model: google(id) })), enabled: enabled(), ip: clientIp(request) })
}
