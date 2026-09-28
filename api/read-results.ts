// POST /api/read-results {text}: one structured-output call reads results written any way; code keeps only grounded rows.
// GET /api/read-results: whether reading is available here (the browser hides the button when it isn't).
import { generateText, Output, type LanguageModel } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { SYSTEM, MAX_LINES, numberLines, checkInput, checkOutput, type ReadOutput } from '../src/intake.js'

export const maxDuration = 30
const MODEL_ID = process.env.REGRADE_MODEL ?? 'gemini-3.8-flash'
const PER_MINUTE = 6, PER_DAY = 40

const schema = z.object({
  rows: z.array(z.object({
    line: z.number().int(), home: z.string(), away: z.string(), homeScore: z.number().int(), awayScore: z.number().int(),
    division: z.string().optional(), date: z.string().optional(),
  })).max(MAX_LINES),
  skipped: z.array(z.object({ line: z.number().int(), reason: z.string() })).max(200),
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

export interface Deps { model: LanguageModel; modelId: string; enabled: boolean; ip: string }

export async function handle(request: Request, deps: Deps): Promise<Response> {
  if (!deps.enabled) return json({ error: 'unavailable', message: 'Reading results with AI is switched off here.' }, 503)
  let body: unknown
  try { body = await request.json() } catch { return json({ error: 'bad_request', message: 'Send JSON: {"text": "..."}' }, 400) }
  const text = (body as { text?: unknown })?.text
  const problem = checkInput(text)
  if (problem) return json({ error: 'bad_input', message: problem }, 400)
  const wait = rateLimited(deps.ip)
  if (wait !== null) return json({ error: 'rate_limited', message: `Too many reads from here; try again in ${wait} s.`, retryAfter: wait }, 429, { 'retry-after': String(wait) })
  const t0 = Date.now()
  try {
    const { output } = await generateText({
      model: deps.model,
      system: SYSTEM,
      prompt: numberLines(text as string),
      output: Output.object({ schema }),
      temperature: 0,
      maxOutputTokens: 6000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(25_000),
    })
    const checked = checkOutput(output as ReadOutput, text as string)
    return json({ ...checked, model: deps.modelId, ms: Date.now() - t0 })
  } catch (e) {
    const name = (e as Error)?.name ?? 'Error'
    const timeout = name === 'TimeoutError' || name === 'AbortError'
    // the message is logged without the pasted text (content capture off)
    console.error('read-results failed', name, String((e as Error)?.message ?? '').slice(0, 200))
    return json({ error: timeout ? 'timeout' : 'model_error', message: timeout ? 'Reading took too long. Try fewer lines.' : 'The model could not read that. Try again, or paste a results table.' }, timeout ? 504 : 502)
  }
}

const clientIp = (r: Request): string => r.headers.get('x-real-ip') ?? r.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

export function GET(): Response {
  return json({ enabled: enabled(), model: enabled() ? MODEL_ID : null })
}

export function POST(request: Request): Promise<Response> {
  return handle(request, { model: google(MODEL_ID), modelId: MODEL_ID, enabled: enabled(), ip: clientIp(request) })
}
