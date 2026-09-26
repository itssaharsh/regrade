import { parseResults, computeStats, playedPairs, slug, type Parsed, type ParseError } from './results.ts'
import { proposeBands, moveTeam, bandSpread, movedTeams } from './banding.ts'
import { generateBlock, slotsFor } from './scheduler.ts'
import { toUploaderCsv, UPLOADER_COLUMNS, fixtureRow } from './export.ts'
import { sampleResultsCsv, sampleSetup, SAMPLE_LEAGUE } from './seed.ts'
import type { Band, Block, Setup, TeamStats, Fixture } from './model.ts'

interface State {
  source: 'sample' | 'own'
  resultsText: string
  parsed: Parsed
  stats: Map<string, TeamStats>
  played: Set<string>
  recordedDivision: Map<string, string>
  bands: Band[]
  setup: Setup
  block: Block | null
  stale: boolean
  week: number
  importOpen: boolean
  importDraft: string
  importErrors: ParseError[]
  animate: boolean
  dragId: string | null
}

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const say = (msg: string): void => { $('#status').textContent = msg }
const BAND_CLASS = ['sw-a', 'sw-b', 'sw-c', 'sw-d', 'sw-e']

let state: State

function fromText(text: string, source: 'sample' | 'own', setup?: Setup): State | null {
  const parsed = parseResults(text)
  if (parsed.results.length === 0) return null
  const stats = computeStats(parsed.results, parsed.teams)
  const recorded = new Map<string, string>()
  for (const r of parsed.results) { recorded.set(slug(r.home), r.division); recorded.set(slug(r.away), r.division) }
  return {
    source, resultsText: text, parsed, stats, played: playedPairs(parsed.results), recordedDivision: recorded,
    bands: proposeBands([...stats.values()], 3), setup: setup ?? sampleSetup(), block: null, stale: false, week: 1,
    importOpen: false, importDraft: '', importErrors: parsed.errors, animate: false, dragId: null,
  }
}

function init(): void {
  state = fromText(sampleResultsCsv().csv, 'sample')!
  const params = new URLSearchParams(location.search)
  const st = params.get('state')
  if (st === 'generated' || st === 'stale' || st === 'dragging') generate(false)
  if (st === 'partial') { state.setup.venues[1].pitches = state.setup.venues[1].pitches.slice(0, 2); generate(false) }
  if (st === 'stale') { state.bands = moveTeam(state.bands, state.bands[0].teamIds[15], state.bands[1].id, 0); state.stale = true }
  if (st === 'error') { state.importOpen = true; state.importDraft = 'Date,Home Team,Away Team,Home Score,Away Score\n12/09/2026,Oakford Colts Reds,Ashby Lions Blues,3,1\n12/09/2026,Hartwell Rovers Whites,Brindley Youth Blacks,,2'; state.importErrors = parseResults(state.importDraft).errors }
  render()
  if (st === 'dragging') document.querySelector('.team')?.classList.add('dragging')
  document.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyR') { e.preventDefault(); reset() }
    if (e.altKey && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); generate(true) }
  })
}

function reset(): void {
  state = fromText(sampleResultsCsv().csv, 'sample')!
  render()
  say('Sample league reloaded.')
}

function generate(animate: boolean): void {
  if (state.parsed.results.length === 0) return
  state.block = generateBlock(state.bands, state.stats, state.played, state.parsed.teams, state.setup)
  state.stale = false
  state.week = 1
  state.animate = animate
  render()
  const c = state.block.counters
  say(`Generated ${state.block.fixtures.length} fixtures over ${state.setup.weeks} weeks. ${c.clashes} clashes, ${c.repeats} repeat pairings, ${state.block.unscheduled.length} unscheduled, ${state.block.byes.length} byes.`)
}

function onMove(teamId: string, toBandId: string, index?: number): void {
  const before = JSON.stringify(state.bands)
  state.bands = moveTeam(state.bands, teamId, toBandId, index)
  if (JSON.stringify(state.bands) === before) return
  state.stale = state.block !== null
  render()
  const t = state.parsed.teams.find(t => t.id === teamId)
  const b = state.bands.find(b => b.id === toBandId)
  say(`${t?.name ?? teamId} moved to ${b?.name ?? toBandId}.`)
}

// ---------- render
function render(): void {
  renderImport(); renderBands(); renderSlots(); renderStageHead(); renderGrid(); renderByes(); renderUnscheduled(); renderExport(); renderLog()
  state.animate = false
}

function renderImport(): void {
  const el = $('#import')
  const summary = state.source === 'sample'
    ? `${esc(SAMPLE_LEAGUE)}: ${state.parsed.results.length} results, ${state.parsed.teams.length} teams`
    : `Your results: ${state.parsed.results.length} results, ${state.parsed.teams.length} teams`
  if (!state.importOpen) {
    el.innerHTML = `<h2 id="import-h">Results</h2><p class="small">${summary}</p>
      <div class="row"><button class="btn small" type="button" id="own">Use your own results</button>${state.source === 'own' ? '<button class="btn small ghost" type="button" id="sample">Load sample results</button>' : ''}</div>`
    $('#own').addEventListener('click', () => { state.importOpen = true; state.importDraft = state.source === 'own' ? state.resultsText : ''; state.importErrors = []; render(); $('#draft').focus() })
    document.querySelector('#sample')?.addEventListener('click', () => reset())
    return
  }
  el.innerHTML = `<h2 id="import-h">Results</h2>
    <p class="small muted">Paste the block's results: the Full-Time uploader layout with scores filled in, or a simple table.</p>
    <label class="sr-only" for="draft">Results</label>
    <textarea id="draft" placeholder="Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score&#10;12/09/2026,09:00,Division 1,Oakford Colts Reds,Ashby Lions Blues,Oakford Leisure Centre,Pitch 1,3,1" aria-describedby="draft-help">${esc(state.importDraft)}</textarea>
    <p id="draft-help" class="caption">Dates as DD/MM/YYYY. Team names must match between rows.</p>
    ${state.importErrors.length ? `<div role="alert"><ul class="errors">${state.importErrors.slice(0, 6).map(e => `<li>${esc(e.message)}</li>`).join('')}${state.importErrors.length > 6 ? `<li>and ${state.importErrors.length - 6} more</li>` : ''}</ul></div>` : ''}
    <div class="row"><button class="btn small primary" type="button" id="load">Load results</button><button class="btn small ghost" type="button" id="sample">Load sample results</button><button class="btn small ghost" type="button" id="cancel">Cancel</button></div>`
  const ta = $('#draft') as HTMLTextAreaElement
  ta.addEventListener('input', () => { state.importDraft = ta.value })
  $('#load').addEventListener('click', () => {
    const parsed = parseResults(ta.value)
    if (parsed.results.length === 0) { state.importErrors = parsed.errors.length ? parsed.errors : [{ row: 0, message: 'No results found' }]; render(); return }
    const next = fromText(ta.value, 'own', state.setup)!
    state = next
    state.importErrors = parsed.errors
    if (parsed.errors.length) { state.importOpen = true; state.importDraft = ta.value }
    render()
    say(`Loaded ${parsed.results.length} results for ${parsed.teams.length} teams${parsed.errors.length ? `, ${parsed.errors.length} rows skipped` : ''}.`)
  })
  $('#sample').addEventListener('click', () => reset())
  $('#cancel').addEventListener('click', () => { state.importOpen = false; render() })
}

function renderBands(): void {
  const el = $('#bands')
  const name = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
  const moved = movedTeams(state.bands, state.recordedDivision)
  el.innerHTML = `<h2 id="bands-h">Bands by goals per game</h2>
    <p class="small muted">Ordered by goal difference per game; spread is the gap between a band's strongest and weakest team. Drag a team between bands, or use the arrows. ${moved} team${moved === 1 ? '' : 's'} change division against the results file.</p>
    ${state.bands.map((b, bi) => {
      const spread = bandSpread(b, state.stats)
      return `<section class="band" data-band="${b.id}"><div class="band-head"><h3><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${b.name.slice(-1)}</span>${esc(b.name)}</h3><span class="spread num">${b.teamIds.length} teams${b.teamIds.length % 2 ? ' (one bye a week)' : ''}, spread ${spread.toFixed(2)}</span></div>
        <ul class="band-list" data-band="${b.id}" aria-label="${esc(b.name)}">${b.teamIds.map(id => {
          const s = state.stats.get(id)!
          return `<li class="team" draggable="true" data-id="${id}"><span class="handle" aria-hidden="true">⠿</span><span class="name" title="${esc(name(id))}">${esc(name(id))}</span><span class="stat num" title="${s.played} played, goal difference per game">${s.gdPerGame >= 0 ? '+' : '−'}${Math.abs(s.gdPerGame).toFixed(2)}</span><span class="move">${bi > 0 ? `<button type="button" data-up="${id}" aria-label="Move ${esc(name(id))} up to ${esc(state.bands[bi - 1].name)}">↑</button>` : ''}${bi < state.bands.length - 1 ? `<button type="button" data-down="${id}" aria-label="Move ${esc(name(id))} down to ${esc(state.bands[bi + 1].name)}">↓</button>` : ''}</span></li>`
        }).join('')}</ul></section>`
    }).join('')}`
  el.querySelectorAll<HTMLButtonElement>('button[data-up]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.up!; const bi = state.bands.findIndex(x => x.teamIds.includes(id)); onMove(id, state.bands[bi - 1].id)
  }))
  el.querySelectorAll<HTMLButtonElement>('button[data-down]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.down!; const bi = state.bands.findIndex(x => x.teamIds.includes(id)); onMove(id, state.bands[bi + 1].id, 0)
  }))
  el.querySelectorAll<HTMLLIElement>('li.team').forEach(li => {
    li.addEventListener('dragstart', e => { state.dragId = li.dataset.id!; li.classList.add('dragging'); e.dataTransfer?.setData('text/plain', state.dragId); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' })
    li.addEventListener('dragend', () => { state.dragId = null; li.classList.remove('dragging'); el.querySelectorAll('.over').forEach(x => x.classList.remove('over')) })
  })
  el.querySelectorAll<HTMLUListElement>('ul.band-list').forEach(ul => {
    ul.addEventListener('dragover', e => { e.preventDefault(); ul.classList.add('over'); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move' })
    ul.addEventListener('dragleave', () => ul.classList.remove('over'))
    ul.addEventListener('drop', e => {
      e.preventDefault(); ul.classList.remove('over')
      const id = state.dragId ?? e.dataTransfer?.getData('text/plain'); if (!id) return
      const rows = [...ul.querySelectorAll<HTMLLIElement>('li.team')].filter(r => r.dataset.id !== id)
      let index = rows.length
      for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { index = i; break } }
      onMove(id, ul.dataset.band!, index)
    })
  })
}

function renderSlots(): void {
  const el = $('#slots')
  const n = slotsFor(state.setup).length
  el.innerHTML = `<h2 id="slots-h">Pitch slots</h2>
    <p class="small muted"><b class="num">${n}</b> slots per Saturday: ${state.setup.venues.length} venues, ${state.setup.times.join(', ')}.</p>
    ${state.setup.venues.map((v, vi) => `<div class="venue"><span>${esc(v.name)}</span><span class="stepper" role="group" aria-label="Pitches at ${esc(v.name)}"><button type="button" data-v="${vi}" data-d="-1" aria-label="Remove a pitch at ${esc(v.name)}">−</button><output class="num">${v.pitches.length}</output><span class="small muted">pitches</span><button type="button" data-v="${vi}" data-d="1" aria-label="Add a pitch at ${esc(v.name)}">+</button></span></div>`).join('')}
    <div class="venue"><label for="first">First Saturday</label><input id="first" type="date" value="${state.setup.firstSaturday}"></div>`
  el.querySelectorAll<HTMLButtonElement>('button[data-v]').forEach(b => b.addEventListener('click', () => {
    const v = state.setup.venues[Number(b.dataset.v)]
    const count = Math.max(1, Math.min(6, v.pitches.length + Number(b.dataset.d)))
    v.pitches = Array.from({ length: count }, (_, i) => `Pitch ${i + 1}`)
    state.stale = state.block !== null
    render()
    say(`${v.name}: ${count} pitches, ${slotsFor(state.setup).length} slots per Saturday.`)
  }))
  ;($('#first') as HTMLInputElement).addEventListener('change', e => {
    const v = (e.target as HTMLInputElement).value
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { state.setup.firstSaturday = v; state.stale = state.block !== null; render() }
  })
}

function renderStageHead(): void {
  const weeks = $('#weeks')
  weeks.innerHTML = Array.from({ length: state.setup.weeks }, (_, i) => `<button type="button" role="tab" class="tab" aria-selected="${state.week === i + 1}" ${state.block ? '' : 'disabled'} data-week="${i + 1}">Week ${i + 1}</button>`).join('')
  weeks.querySelectorAll<HTMLButtonElement>('.tab').forEach(t => t.addEventListener('click', () => { state.week = Number(t.dataset.week); render() }))
  const chips = $('#chips')
  const moved = movedTeams(state.bands, state.recordedDivision)
  const c = state.block?.counters
  const chip = (label: string, value: string | number | null, ok?: boolean): string => `<span class="chip ${value === null ? '' : ok ? 'ok' : 'bad'}">${label} <b class="num">${value === null ? '—' : value}</b></span>`
  chips.innerHTML = [
    chip('Clashes', c ? c.clashes : null, c ? c.clashes === 0 : undefined),
    chip('Repeat pairings', c ? c.repeats : null, c ? c.repeats === 0 : undefined),
    chip('Home/away gap', c ? c.maxHomeAwayGap : null, c ? c.maxHomeAwayGap <= 1 : undefined),
    `<span class="chip" title="teams that change division against the results file">Regraded <b class="num">${moved}</b></span>`,
  ].join('')
  const btn = $('#generate') as HTMLButtonElement
  btn.textContent = state.block ? (state.stale ? `Regenerate ${state.setup.weeks} weeks` : `Generate ${state.setup.weeks} weeks`) : `Generate ${state.setup.weeks} weeks`
  btn.onclick = () => generate(true)
  const actions = btn.parentElement as HTMLElement
  actions.querySelector('.stale')?.remove()
  if (state.stale) { const p = document.createElement('p'); p.className = 'stale'; p.textContent = 'Changed since the last block. Generate again.'; actions.appendChild(p) }
}

function renderGrid(): void {
  const el = $('#grid')
  const name = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
  if (!state.block) {
    const n = slotsFor(state.setup).length
    el.innerHTML = `<div class="grid-first"><strong>Generate to fill ${state.setup.weeks} weeks</strong>${state.bands.reduce((a, b) => a + Math.floor(b.teamIds.length / 2), 0)} fixtures a week into ${n} slots</div>`
    return
  }
  const wk = state.block.fixtures.filter(f => f.week === state.week)
  const by = new Map<string, Fixture>()
  for (const f of wk) by.set(`${f.venue}|${f.pitch}|${f.time}`, f)
  const bandIdx = (division: string): number => Math.max(0, state.bands.findIndex(b => b.name === division))
  let order = 0
  const mini = `<svg class="mini" viewBox="0 0 120 22" aria-hidden="true"><rect x="1" y="1" width="118" height="20" fill="none" stroke="var(--pitch)" stroke-width="1.2"/><line x1="60" y1="1" x2="60" y2="21" stroke="var(--pitch)" stroke-width="1.2"/><rect x="1" y="6" width="14" height="10" fill="none" stroke="var(--pitch)" stroke-width="1.2"/><rect x="105" y="6" width="14" height="10" fill="none" stroke="var(--pitch)" stroke-width="1.2"/></svg>`
  const date = wk[0]?.date ?? ''
  el.innerHTML = state.setup.venues.map(v => `<div class="gtable"><table class="grid" aria-label="${esc(v.name)}, week ${state.week}">
    <thead><tr><th scope="col" class="venue-h" colspan="${v.pitches.length + 1}">${esc(v.name)}</th></tr>
    <tr><th scope="col" class="date-h">${date ? esc(toUk(date)) : ''}</th>${v.pitches.map(p => `<th scope="col" class="pitch-h">${mini}${esc(p)}</th>`).join('')}</tr></thead>
    <tbody>${state.setup.times.map(time => `<tr><td class="time num">${time}</td>${v.pitches.map(p => {
      const f = by.get(`${v.name}|${p}|${time}`)
      if (!f) return `<td class="cell"><span class="empty-cell">free</span></td>`
      const i = order++
      const bi = bandIdx(f.division)
      return `<td class="cell"><div class="fx ${state.animate ? 'enter' : ''}" style="animation-delay:${i * 40}ms"><div class="pair"><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${esc(f.division.slice(-1))}</span><span title="${esc(name(f.homeId))}">${esc(name(f.homeId))}</span></div><div class="pair"><span class="swatch" style="visibility:hidden" aria-hidden="true">v</span><span title="${esc(name(f.awayId))}">${esc(name(f.awayId))}</span></div></div></td>`
    }).join('')}</tr>`).join('')}</tbody></table></div>`).join('')
}

const toUk = (iso: string): string => { const [y, m, d] = iso.split('-'); return `Sat ${d}/${m}/${y}` }

function renderByes(): void {
  const el = $('#byes')
  const name = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
  if (!state.block || state.block.byes.length === 0) { el.innerHTML = ''; return }
  const wk = state.block.byes.filter(b => b.week === state.week)
  const bandOf = (id: string): string => state.bands.find(b => b.teamIds.includes(id))?.name ?? ''
  el.innerHTML = `<p class="byes"><b>Bye this Saturday:</b> ${wk.map(b => `${esc(name(b.teamId))} (${esc(bandOf(b.teamId))})`).join(', ') || 'none'}. <span class="muted">Bands with an odd number of teams rest one team each week, a different team every week.</span></p>`
}

function renderUnscheduled(): void {
  const el = $('#unscheduled')
  const name = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
  if (!state.block || state.block.unscheduled.length === 0) { el.innerHTML = ''; return }
  const b = state.block
  const thisWeek = b.unscheduled.filter(u => u.week === state.week)
  el.innerHTML = `<div class="unsched" role="alert"><h3>${b.unscheduled.length} fixture${b.unscheduled.length === 1 ? '' : 's'} don't fit</h3>
    <p>${b.neededPerWeek} needed each Saturday, ${b.slotsPerWeek} slots. Add a pitch or a time, or move ${Math.ceil((b.neededPerWeek - b.slotsPerWeek))} pairs to a Sunday.</p>
    <ul>${thisWeek.map(u => `<li>${esc(name(u.homeId))} v ${esc(name(u.awayId))} (${esc(u.division)})</li>`).join('')}${thisWeek.length === 0 ? '<li>None this week</li>' : ''}</ul></div>`
}

function renderExport(): void {
  const el = $('#export')
  if (!state.block || state.block.fixtures.length === 0) { el.innerHTML = ''; el.hidden = true; return }
  el.hidden = false
  const name = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
  const rows = [...state.block.fixtures].sort((a, b) => a.week - b.week || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue) || a.pitch.localeCompare(b.pitch)).slice(0, 8)
  el.innerHTML = `<h2 id="export-h">Export</h2><p class="small muted">fixtureupload.csv in the Full-Time uploader's nine columns. Showing 8 of ${state.block.fixtures.length} rows.</p>
    <div class="csv" role="region" aria-label="CSV preview" tabindex="0"><table><thead><tr>${UPLOADER_COLUMNS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(f => `<tr>${fixtureRow(f, name).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="row"><button class="btn" type="button" id="download">Download fixtureupload.csv</button><button class="btn ghost" type="button" id="copy">Copy CSV</button></div>`
  const csv = toUploaderCsv(state.block, name)
  $('#download').addEventListener('click', () => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fixtureupload.csv'; document.body.appendChild(a); a.click(); a.remove()
    const b = $('#download'); b.textContent = 'Downloaded'; say('fixtureupload.csv downloaded.'); setTimeout(() => { b.textContent = 'Download fixtureupload.csv' }, 2000)
  })
  $('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(csv); say('CSV copied.') } catch { say('Copy failed; use Download.') } })
}

function renderLog(): void {
  const pre = document.querySelector('#log pre') as HTMLPreElement
  const rules = ['Hard: one fixture per venue, pitch and time slot', 'Hard: every team plays once per Saturday', 'Hard: no pairing repeated within the block; pairings already played this season avoided (counted if unavoidable)', 'Balance: every team within one home game of its away games across the block', 'Preference: a band plays at one venue each Saturday, rotating; a club\'s teams share a venue']
  pre.textContent = rules.map(r => `• ${r}`).join('\n') + (state.block ? '\n\n' + state.block.log.join('\n') : '\n\nNo block generated yet.')
}

init()
