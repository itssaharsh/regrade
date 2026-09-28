// QA test double: the ideal reading of the fictional sample message, in the function's response shape.
// Used only by qa/shots.py to exercise the review screen; it says nothing about how well a model reads.
import { checkOutput, sourceLines, type ReadRow } from '../src/intake.ts'
import { sampleMessage, sampleResultsCsv } from '../src/seed.ts'

const text = sampleMessage(), lines = sourceLines(text), games = sampleResultsCsv().nextSaturday
const rows: ReadRow[] = [], skipped: { line: number; reason: string }[] = []
lines.forEach((l, i) => {
  const g = games.find(g => l.includes(g.away))
  if (!g) return
  if (/postponed/.test(l)) { skipped.push({ line: i + 1, reason: 'postponed, pitch waterlogged' }); return }
  const home = l.slice(0, l.search(/ v | \d| beat /)).trim()
  rows.push({ line: i + 1, home, away: g.away, homeScore: g.hs, awayScore: g.as, division: g.division, date: '17/10' })
})
console.log(JSON.stringify({ ...checkOutput({ rows, skipped }, text), model: 'QA test double', ms: 1200 }))
