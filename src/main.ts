import { parseResults, computeStats, playedPairs, slug, type Parsed, type ParseError } from './results.ts'
import { proposeBands, moveTeam, bandSpread, movedTeams, divisionNames } from './banding.ts'
import { generateBlock, slotsFor, isSaturday, parseTimes, shortfallAdvice } from './scheduler.ts'
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
  setupError: string
  animate: boolean
  dragId: string | null
}

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const say = (msg: string): void => { $('#status').textContent = msg }
const BAND_CLASS = ['sw-a', 'sw-b', 'sw-c', 'sw-d', 'sw-e']
const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

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
    importOpen: false, importDraft: '', importErrors: parsed.errors, setupError: '', animate: false, dragId: null,
  }
}

const teamName = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
const exportNames = (): Map<string, string> => divisionNames(state.bands, state.recordedDivision)

function init(): void {
  state = fromText(sampleResultsCsv().csv, 'sample')!
  const st = new URLSearchParams(location.search).get('state')
  if (st === 'generated' || st === 'stale' || st === 'dragging') generate(false, false)
  if (st === 'partial') { state.setup.venues[1].pitches = state.setup.venues[1].pitches.slice(0, 2); generate(false, false) }
  if (st === 'stale') { state.bands = moveTeam(state.bands, state.bands[0].teamIds[15], state.bands[1].id, 0); state.stale = true }
  if (st === 'error') {
    state.importOpen = true
    state.importDraft = 'Date,Home Team,Away Team,Home Score,Away Score\n12/09/2026,Oakford Colts Reds,Ashby Lions Blues,3,1\n12/09/2026,Hartwell Rovers Whites,Brindley Youth Blacks,,2'
    state.importErrors = parseResults(state.importDraft).errors
  }
  render()
  if (st === 'dragging') document.querySelector('.team')?.classList.add('dragging')
  document.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyR') { e.preventDefault(); reset() }
    if (e.altKey && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); generate(true, true) }
  })
}

function reset(): void {
  state = fromText(sampleResultsCsv().csv, 'sample')!
  render()
  say('Sample league reloaded.')
}

function generate(animate: boolean, reveal: boolean): void {
  if (state.parsed.results.length === 0) return
  state.block = generateBlock(state.bands, state.stats, state.played, state.parsed.teams, state.setup, exportNames())
  state.stale = false
  state.week = 1
  state.animate = animate
  render()
  const b = state.block, c = b.counters
  say(`Generated ${b.fixtures.length} fixtures over ${state.setup.weeks} weeks. ${c.clashes} clashes, ${c.repeats} repeat pairings, ${b.unscheduled.length} unscheduled, ${b.byes.length} byes.`)
  // on narrow screens the grid is far below the fixed Generate button: bring the result into view (review #35)
  if (reveal && window.innerWidth < 1024) $('#stage').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

function markStale(): void { state.stale = state.block !== null }

function onMove(teamId: string, toBandId: string, index?: number): void {
  const before = JSON.stringify(state.bands)
  state.bands = moveTeam(state.bands, teamId, toBandId, index)
  if (JSON.stringify(state.bands) === before) return
  markStale()
  render()
  say(`${teamName(teamId)} moved to ${state.bands.find(b => b.id === toBandId)?.name ?? toBandId}.`)
}

// ---------- focus survives re-rendering (review #5)
function focusCandidates(el: Element | null): string[] {
  if (!(el instanceof HTMLElement) || el === document.body) return []
  const d = el.dataset
  if (d.up) return [`button[data-up="${d.up}"]`, `button[data-down="${d.up}"]`]
  if (d.down) return [`button[data-down="${d.down}"]`, `button[data-up="${d.down}"]`]
  if (d.v !== undefined && d.d !== undefined) return [`button[data-v="${d.v}"][data-d="${d.d}"]`, `button[data-v="${d.v}"]`, '#add-venue']
  if (d.week) return [`button[data-week="${d.week}"]`]
  if (el.id) return [`#${el.id}`]
  return []
}

function render(): void {
  const active = document.activeElement
  const candidates = focusCandidates(active)
  renderImport(); renderSlots(); renderBands(); renderStageHead(); renderGrid(); renderByes(); renderUnscheduled(); renderExport(); renderLog()
  state.animate = false
  if (active && !document.contains(active)) {
    for (const sel of candidates) { const next = document.querySelector<HTMLElement>(sel); if (next) { next.focus(); break } }
  }
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
    <p class="small muted">Paste the block's results: the Full-Time uploader layout with scores filled in, or a simple table. Comma- or tab-separated (copied from a spreadsheet) both work.</p>
    <label class="sr-only" for="draft">Results</label>
    <textarea id="draft" placeholder="Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score&#10;12/09/2026,09:00,Division 1,Oakford Colts Reds,Ashby Lions Blues,Oakford Leisure Centre,Pitch 1,3,1" aria-describedby="draft-help${state.importErrors.length ? ' draft-errors' : ''}"${state.importErrors.length ? ' aria-invalid="true"' : ''}>${esc(state.importDraft)}</textarea>
    <p id="draft-help" class="caption">Dates as DD/MM/YYYY. Team names must match between rows. The Division column names the divisions your export will use.</p>
    ${state.importErrors.length ? `<div role="alert" id="draft-errors"><ul class="errors">${state.importErrors.slice(0, 6).map(e => `<li>${esc(e.message)}</li>`).join('')}${state.importErrors.length > 6 ? `<li>and ${state.importErrors.length - 6} more</li>` : ''}</ul></div>` : ''}
    <div class="row"><button class="btn small" type="button" id="load">Load results</button><button class="btn small ghost" type="button" id="sample">Load sample results</button><button class="btn small ghost" type="button" id="cancel">Cancel</button></div>`
  const ta = $('#draft') as HTMLTextAreaElement
  ta.addEventListener('input', () => { state.importDraft = ta.value })
  $('#load').addEventListener('click', () => {
    const parsed = parseResults(ta.value)
    if (parsed.results.length === 0) { state.importErrors = parsed.errors.length ? parsed.errors : [{ row: 0, message: 'No results found' }]; render(); $('#draft').focus(); return }
    state = fromText(ta.value, 'own', state.setup)!
    state.importErrors = parsed.errors
    if (parsed.errors.length) { state.importOpen = true; state.importDraft = ta.value }
    render()
    say(`Loaded ${parsed.results.length} results for ${parsed.teams.length} teams${parsed.errors.length ? `, ${parsed.errors.length} rows skipped` : ''}.`)
  })
  $('#sample').addEventListener('click', () => reset())
  $('#cancel').addEventListener('click', () => { state.importOpen = false; render(); $('#own').focus() })
}

function renderSlots(): void {
  const el = $('#slots')
  const s = state.setup
  const n = slotsFor(s).length
  el.innerHTML = `<h2 id="slots-h">Pitch slots</h2>
    <p class="small muted"><b class="num">${n}</b> slots per Saturday across ${s.venues.length} venue${s.venues.length === 1 ? '' : 's'}.</p>
    ${s.venues.map((v, vi) => `<div class="venue">
      <label class="sr-only" for="vname-${vi}">Venue ${vi + 1} name</label>
      <input class="vname" id="vname-${vi}" data-vname="${vi}" type="text" value="${esc(v.name)}" autocomplete="off">
      <span class="stepper" role="group" aria-label="Pitches at ${esc(v.name)}"><button type="button" data-v="${vi}" data-d="-1" aria-label="Remove a pitch at ${esc(v.name)}">−</button><output class="num" aria-live="off">${v.pitches.length}</output><span class="small muted">pitches</span><button type="button" data-v="${vi}" data-d="1" aria-label="Add a pitch at ${esc(v.name)}">+</button></span>
      ${s.venues.length > 1 ? `<button type="button" class="icon-x" id="rm-venue-${vi}" data-rmvenue="${vi}" aria-label="Remove venue ${esc(v.name)}" title="Remove venue">×</button>` : ''}
    </div>`).join('')}
    <div class="row"><button type="button" class="btn small ghost" id="add-venue" ${s.venues.length >= 6 ? 'aria-disabled="true"' : ''}>Add a venue</button></div>
    <div class="field"><label for="times">Kick-off times</label><input id="times" type="text" inputmode="numeric" value="${esc(s.times.join(', '))}" autocomplete="off" aria-describedby="times-help${state.setupError.startsWith('times:') ? ' setup-error' : ''}"><span id="times-help" class="caption">24-hour, comma-separated</span></div>
    <div class="field"><label for="first">First Saturday</label><input id="first" type="date" value="${s.firstSaturday}"${state.setupError.startsWith('first:') ? ' aria-invalid="true" aria-describedby="setup-error"' : ''}></div>
    ${state.setupError ? `<p class="reason" id="setup-error" role="alert">${esc(state.setupError.replace(/^\w+:\s*/, ''))}</p>` : ''}`
  const setError = (msg: string): void => { state.setupError = msg; render() }
  el.querySelectorAll<HTMLButtonElement>('button[data-v]').forEach(b => b.addEventListener('click', () => {
    const v = s.venues[Number(b.dataset.v)]
    const count = Math.max(1, Math.min(6, v.pitches.length + Number(b.dataset.d)))
    v.pitches = Array.from({ length: count }, (_, i) => `Pitch ${i + 1}`)
    state.setupError = ''; markStale(); render()
    say(`${v.name}: ${count} pitches, ${slotsFor(s).length} slots per Saturday.`)
  }))
  el.querySelectorAll<HTMLInputElement>('input[data-vname]').forEach(inp => inp.addEventListener('change', () => {
    const i = Number(inp.dataset.vname), name = inp.value.trim()
    if (!name) return setError('vname: A venue needs a name.')
    if (s.venues.some((v, j) => j !== i && v.name.toLowerCase() === name.toLowerCase())) return setError(`vname: There is already a venue called ${name}.`)
    s.venues[i].name = name; state.setupError = ''; markStale(); render()
  }))
  el.querySelectorAll<HTMLButtonElement>('button[data-rmvenue]').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.rmvenue), gone = s.venues[i].name
    s.venues.splice(i, 1); state.setupError = ''; markStale(); render(); $('#add-venue').focus()
    say(`Removed ${gone}. ${slotsFor(s).length} slots per Saturday.`)
  }))
  $('#add-venue').addEventListener('click', () => {
    if (s.venues.length >= 6) return setError('vname: Six venues is the most this tool plans for.')
    let k = s.venues.length + 1
    while (s.venues.some(v => v.name === `Venue ${k}`)) k++
    s.venues.push({ name: `Venue ${k}`, pitches: ['Pitch 1', 'Pitch 2'] })
    state.setupError = ''; markStale(); render()
    ;($(`#vname-${s.venues.length - 1}`) as HTMLInputElement).select()
    say(`Added Venue ${k} with 2 pitches.`)
  })
  ;($('#times') as HTMLInputElement).addEventListener('change', e => {
    const { times, error } = parseTimes((e.target as HTMLInputElement).value)
    if (error) return setError(`times: ${error}. Kick-off times stay ${s.times.join(', ')}.`)
    s.times = times; state.setupError = ''; markStale(); render()
    say(`Kick-off times: ${times.join(', ')}.`)
  })
  ;($('#first') as HTMLInputElement).addEventListener('change', e => {
    const v = (e.target as HTMLInputElement).value
    if (!isSaturday(v)) {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }) : 'not a date'
      return setError(`first: ${toUk(v, false)} is a ${day}. Pick a Saturday; the block still starts ${toUk(s.firstSaturday)}.`)
    }
    s.firstSaturday = v; state.setupError = ''; markStale(); render()
  })
}

function renderBands(): void {
  const el = $('#bands')
  const moved = movedTeams(state.bands, state.recordedDivision)
  const names = exportNames()
  el.innerHTML = `<h2 id="bands-h">Bands by goals per game</h2>
    <p class="small muted">Ordered by goal difference per game; spread is the gap between a band's strongest and weakest team. Drag a team between bands, or use the arrows. <b class="num">${moved}</b> team${moved === 1 ? '' : 's'} change division against the results file.</p>
    ${state.bands.map((b, bi) => {
      const spread = bandSpread(b, state.stats)
      const exportAs = names.get(b.id) ?? b.name
      return `<section class="band" data-band="${b.id}" aria-labelledby="bh-${b.id}"><div class="band-head"><h3 id="bh-${b.id}"><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${b.name.slice(-1)}</span>${esc(b.name)}</h3><span class="spread num">${b.teamIds.length} teams${b.teamIds.length % 2 ? ' (one bye a week)' : ''}, spread ${spread.toFixed(2)}</span>${exportAs !== b.name ? `<span class="exports">exports as ${esc(exportAs)}</span>` : ''}</div>
        <ul class="band-list" data-band="${b.id}" aria-label="${esc(b.name)}">${b.teamIds.map(id => {
          const s = state.stats.get(id)!
          return `<li class="team" draggable="true" data-id="${id}"><span class="handle" aria-hidden="true">⠿</span><span class="name">${esc(teamName(id))}</span><span class="stat num" title="${s.played} played, goal difference per game"><span class="sr-only">goal difference per game </span>${s.gdPerGame >= 0 ? '+' : '−'}${Math.abs(s.gdPerGame).toFixed(2)}</span><span class="move">${bi > 0 ? `<button type="button" data-up="${id}" aria-label="Move ${esc(teamName(id))} up to ${esc(state.bands[bi - 1].name)}">↑</button>` : ''}${bi < state.bands.length - 1 ? `<button type="button" data-down="${id}" aria-label="Move ${esc(teamName(id))} down to ${esc(state.bands[bi + 1].name)}">↓</button>` : ''}</span></li>`
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

function renderStageHead(): void {
  const weeks = $('#weeks')
  const n = state.setup.weeks
  weeks.innerHTML = Array.from({ length: n }, (_, i) => {
    const sel = state.week === i + 1
    return `<button type="button" role="tab" class="tab" id="tab-w${i + 1}" aria-controls="grid" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" ${state.block ? '' : 'aria-disabled="true"'} data-week="${i + 1}">Week ${i + 1}</button>`
  }).join('')
  const select = (w: number, focus: boolean): void => {
    if (!state.block) return
    state.week = w; render()
    if (focus) $(`#tab-w${w}`).focus()
  }
  weeks.querySelectorAll<HTMLButtonElement>('.tab').forEach(t => {
    t.addEventListener('click', () => select(Number(t.dataset.week), false))
    t.addEventListener('keydown', e => {
      const w = Number(t.dataset.week)
      const to = e.key === 'ArrowRight' ? (w % n) + 1 : e.key === 'ArrowLeft' ? ((w + n - 2) % n) + 1 : e.key === 'Home' ? 1 : e.key === 'End' ? n : 0
      if (to) { e.preventDefault(); select(to, true) }
    })
  })
  $('#grid').setAttribute('aria-labelledby', `tab-w${state.week}`)
  const c = state.block?.counters
  const chip = (label: string, value: number | null, ok?: boolean): string => `<span class="chip ${value === null ? '' : ok ? 'ok' : 'bad'}">${label} <b class="num">${value === null ? '—' : value}</b></span>`
  $('#chips').innerHTML = [
    chip('Clashes', c ? c.clashes : null, c ? c.clashes === 0 : undefined),
    chip('Repeat pairings', c ? c.repeats : null, c ? c.repeats === 0 : undefined),
    chip('Home/away gap', c ? c.maxHomeAwayGap : null, c ? c.maxHomeAwayGap <= 1 : undefined),
  ].join('')
  const btn = $('#generate') as HTMLButtonElement
  btn.textContent = state.block && state.stale ? `Regenerate ${n} weeks` : `Generate ${n} weeks`
  btn.onclick = () => generate(true, true)
  const stale = $('#stale')
  stale.hidden = !state.stale
  stale.textContent = state.stale ? 'Changed since the last block. Generate again.' : ''
}

const MINI = `<svg class="mini" viewBox="0 0 120 22" aria-hidden="true"><rect x="1" y="1" width="118" height="20" fill="none" stroke="var(--pitch)" stroke-width="1.2"/><line x1="60" y1="1" x2="60" y2="21" stroke="var(--pitch)" stroke-width="1.2"/><rect x="1" y="6" width="14" height="10" fill="none" stroke="var(--pitch)" stroke-width="1.2"/><rect x="105" y="6" width="14" height="10" fill="none" stroke="var(--pitch)" stroke-width="1.2"/></svg>`

function renderGrid(): void {
  const el = $('#grid')
  const block = state.block
  const wk = block ? block.fixtures.filter(f => f.week === state.week) : []
  const by = new Map<string, Fixture>()
  for (const f of wk) by.set(`${f.venue}|${f.pitch}|${f.time}`, f)
  const bandIdx = (bandId: string): number => Math.max(0, state.bands.findIndex(b => b.id === bandId))
  const date = block ? (wk[0]?.date ?? '') : state.setup.firstSaturday
  let order = 0
  const perWeek = state.bands.reduce((a, b) => a + Math.floor(b.teamIds.length / 2), 0)
  const intro = block ? '' : `<p class="grid-first"><strong>Generate to fill ${state.setup.weeks} weeks.</strong> ${perWeek} fixtures a week into ${slotsFor(state.setup).length} slots.</p>`
  el.innerHTML = intro + state.setup.venues.map(v => `<div class="gtable" role="region" aria-label="${esc(v.name)} fixtures" tabindex="0"><table class="grid${block ? '' : ' empty'}">
    <caption class="venue-h">${esc(v.name)}</caption>
    <thead><tr><th scope="col" class="date-h">${date ? esc(toUk(date)) : ''}</th>${v.pitches.map(p => `<th scope="col" class="pitch-h">${MINI}${esc(p)}</th>`).join('')}</tr></thead>
    <tbody>${state.setup.times.map(time => `<tr><th scope="row" class="time num">${time}</th>${v.pitches.map(p => {
      if (!block) return `<td class="cell"><span class="empty-cell" aria-hidden="true">—</span><span class="sr-only">empty</span></td>`
      const f = by.get(`${v.name}|${p}|${time}`)
      if (!f) return `<td class="cell"><span class="empty-cell">free</span></td>`
      const i = order++
      const bi = bandIdx(f.band)
      const band = state.bands[bi]?.name ?? f.division
      return `<td class="cell"><div class="fx ${state.animate ? 'enter' : ''}" style="animation-delay:${i * 40}ms"><div class="pair"><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${esc(band.slice(-1))}</span><span class="sr-only">${esc(band)}: </span><span class="tn" title="${esc(teamName(f.homeId))}">${esc(teamName(f.homeId))}</span></div><div class="pair"><span class="swatch" style="visibility:hidden" aria-hidden="true">v</span><span class="sr-only"> versus </span><span class="tn" title="${esc(teamName(f.awayId))}">${esc(teamName(f.awayId))}</span></div></div></td>`
    }).join('')}</tr>`).join('')}</tbody></table></div>`).join('')
}

function toUk(iso: string, withDay = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || 'That'
  const [y, m, d] = iso.split('-')
  const day = new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
  return withDay ? `${day} ${d}/${m}/${y}` : `${d}/${m}/${y}`
}

function renderByes(): void {
  const el = $('#byes')
  if (!state.block || state.block.byes.length === 0) { el.innerHTML = ''; return }
  const wk = state.block.byes.filter(b => b.week === state.week)
  const bandOf = (id: string): string => state.bands.find(b => b.teamIds.includes(id))?.name ?? ''
  el.innerHTML = `<p class="byes"><b>Bye this Saturday:</b> ${wk.map(b => `${esc(teamName(b.teamId))} (${esc(bandOf(b.teamId))})`).join(', ') || 'none'}. <span class="muted">Bands with an odd number of teams rest one team each week, a different team every week.</span></p>`
}

function renderUnscheduled(): void {
  const el = $('#unscheduled')
  if (!state.block || state.block.unscheduled.length === 0) { el.innerHTML = ''; return }
  const b = state.block
  const thisWeek = b.unscheduled.filter(u => u.week === state.week)
  const pitches = state.setup.venues.reduce((a, v) => a + v.pitches.length, 0)
  const advice = shortfallAdvice(b.neededPerWeek, b.slotsPerWeek, state.setup.times.length, pitches)
  el.innerHTML = `<div class="unsched" role="alert"><h3>${thisWeek.length} fixture${thisWeek.length === 1 ? '' : 's'} don't fit this Saturday</h3>
    <p>${b.neededPerWeek} fixtures are needed each Saturday and there are ${b.slotsPerWeek} slots: ${b.unscheduled.length} don't fit across the ${state.setup.weeks} weeks. ${advice}</p>
    <ul>${thisWeek.map(u => `<li>${esc(teamName(u.homeId))} v ${esc(teamName(u.awayId))} (${esc(state.bands.find(x => x.id === u.band)?.name ?? u.division)})</li>`).join('')}${thisWeek.length === 0 ? '<li>None this week</li>' : ''}</ul></div>`
}

function renderExport(): void {
  const el = $('#export')
  if (!state.block || state.block.fixtures.length === 0) { el.innerHTML = ''; el.hidden = true; return }
  el.hidden = false
  const rows = [...state.block.fixtures].sort((a, b) => a.week - b.week || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue) || a.pitch.localeCompare(b.pitch)).slice(0, 8)
  el.innerHTML = `<h2 id="export-h">Export</h2><p class="small muted">fixtureupload.csv in the Full-Time uploader's nine columns, with each band under its division name from your results. Showing 8 of ${state.block.fixtures.length} rows.</p>
    <div class="csv" role="region" aria-label="CSV preview" tabindex="0"><table><thead><tr>${UPLOADER_COLUMNS.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(f => `<tr>${fixtureRow(f, teamName).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="row"><button class="btn" type="button" id="download">Download fixtureupload.csv</button><button class="btn ghost" type="button" id="copy">Copy CSV</button></div>`
  const csv = toUploaderCsv(state.block, teamName)
  $('#download').addEventListener('click', () => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fixtureupload.csv'; document.body.appendChild(a); a.click(); a.remove()
    const b = $('#download'); b.textContent = 'Downloaded'; say('fixtureupload.csv downloaded.'); setTimeout(() => { b.textContent = 'Download fixtureupload.csv' }, 2000)
  })
  $('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(csv); say('CSV copied.') } catch { say('Copy failed; use Download.') } })
}

function renderLog(): void {
  const pre = document.querySelector('#log pre') as HTMLPreElement
  const rules = [
    'Hard: one fixture per venue, pitch and kick-off time',
    'Hard: a team plays at most once per Saturday; odd bands rest one team a week, rotating',
    'Pairings: none already played this season and none twice in the block, unless a band is too small (then counted as repeats)',
    'Balance: every team within one home game of its away games across the block',
    "Preference: each band's fixtures grouped at as few venues as possible; a club's teams share a venue when they can (splits are logged)",
  ]
  pre.textContent = rules.map(r => `• ${r}`).join('\n') + (state.block ? '\n\n' + state.block.log.join('\n') : '\n\nNo block generated yet.')
}

init()
