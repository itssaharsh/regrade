import { parseResults, computeStats, playedPairs, recordedDivisions, FORMULA_START, type Parsed, type ParseError } from './results.ts'
import { proposeBands, moveTeam, bandSpread, bandScore, movedTeams, divisionNames, divisionLevels, DIVISION_GAP } from './banding.ts'
import { generateBlock, slotsFor, saturday, parseTimes, shortfallAdvice } from './scheduler.ts'
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
  levelOf: (teamId: string) => number
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
  bandCount: number
  /** export name per band, fixed when the bands are proposed so moving a team never renames a band */
  proposedNames: Map<string, string>
  divisionOverride: Map<string, string>
  importNote: string
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
  const recorded = recordedDivisions(parsed.results)
  const levels = divisionLevels(parsed.results.map(r => r.division))
  const levelOf = (id: string): number => levels.get(recorded.get(id) ?? '') ?? 0
  const bandCount = defaultBandCount(parsed.teams.length, recorded)
  const bands = proposeBands([...stats.values()], bandCount, levelOf)
  return {
    source, resultsText: text, parsed, stats, played: playedPairs(parsed.results), recordedDivision: recorded, levelOf,
    bands, setup: setup ?? sampleSetup(), block: null, stale: false, week: 1,
    importOpen: false, importDraft: '', importErrors: parsed.errors, setupError: '', animate: false, dragId: null,
    bandCount, proposedNames: divisionNames(bands, recorded), divisionOverride: new Map(), importNote: '',
  }
}

/** As many bands as the results file has divisions (2 to 5), else 3; never so many that a band has fewer than 4 teams. */
function defaultBandCount(teams: number, recorded: Map<string, string>): number {
  const divisions = new Set([...recorded.values()].filter(Boolean)).size
  return Math.max(1, Math.min(divisions >= 2 && divisions <= 5 ? divisions : 3, maxBands(teams)))
}
const maxBands = (teams: number): number => Math.max(1, Math.min(5, Math.floor(teams / 4)))

/** Has the user put work into this page that a reload would lose? */
const hasWork = (): boolean => state.source === 'own' || state.stale || state.divisionOverride.size > 0

const signed = (v: number): string => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`
/** The number a team is ranked by; when it differs from the raw figure, the tooltip and screen-reader text say why. */
function statCell(s: TeamStats, level: number, division?: string): string {
  const score = bandScore(s, level)
  const why = level > 0 ? `${signed(s.gdPerGame)} a game in ${division ?? 'its division'}, less ${(DIVISION_GAP * level).toFixed(2)} for ${level === 1 ? 'the division' : `the ${level} divisions`} above` : 'goal difference per game'
  return `<span class="stat num" title="${s.played} played; ${esc(why)}"><span class="sr-only">${esc(level > 0 ? `rating ${signed(score)}: ${why}` : 'goal difference per game')} </span><span aria-hidden="${level > 0}">${signed(score)}</span></span>`
}

const teamName = (id: string): string => state.parsed.teams.find(t => t.id === id)?.name ?? id
/** Division name per band for the export: the name the user typed, else the majority division from the results file, else the band name. */
const exportNames = (): Map<string, string> => {
  const names = new Map(state.proposedNames)
  for (const [id, name] of state.divisionOverride) if (names.has(id)) names.set(id, name)
  return names
}
/** Bands that would export under their own "Band X" name, which Full-Time won't recognise. */
const unnamedBands = (): Band[] => { const n = exportNames(); return state.bands.filter(b => n.get(b.id) === b.name) }

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
  // pasted results, moves and setup edits live only in this tab: ask before a reload or the wordmark link throws them away
  // (not under automation, where a leave prompt would stall the QA and demo scripts)
  window.addEventListener('beforeunload', e => { if (hasWork() && !navigator.webdriver) e.preventDefault() })
  document.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyR') { e.preventDefault(); if (state.source === 'sample' || confirm('Reload the sample league? Your results and changes will be lost.')) reset() }
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
    $('#own').addEventListener('click', () => { state.importOpen = true; state.importDraft = state.source === 'own' ? state.resultsText : ''; state.importErrors = []; state.importNote = ''; render(); $('#draft').focus() })
    document.querySelector('#sample')?.addEventListener('click', () => reset())
    return
  }
  el.innerHTML = `<h2 id="import-h">Results</h2>
    <p class="small muted">Paste the block's results: the Full-Time uploader layout with scores filled in, or a simple table. Comma- or tab-separated (copied from a spreadsheet) both work.</p>
    <label class="sr-only" for="draft">Results</label>
    <textarea id="draft" placeholder="Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score&#10;12/09/2026,09:00,Division 1,Oakford Colts Reds,Ashby Lions Blues,Oakford Leisure Centre,Pitch 1,3,1" aria-describedby="draft-help${state.importErrors.length ? ' draft-errors' : ''}"${state.importErrors.length ? ' aria-invalid="true"' : ''}>${esc(state.importDraft)}</textarea>
    <p id="draft-help" class="caption">Dates as DD/MM/YYYY. Team names must match between rows. The Division column names the divisions your export will use.</p>
    ${state.importNote ? `<p class="small load-note">${esc(state.importNote)}</p>` : ''}
    ${state.importErrors.length ? `<div role="alert" id="draft-errors"><ul class="errors">${state.importErrors.slice(0, 6).map(e => `<li>${esc(e.message)}</li>`).join('')}${state.importErrors.length > 6 ? `<li>and ${state.importErrors.length - 6} more</li>` : ''}</ul></div>` : ''}
    <div class="row"><button class="btn small" type="button" id="load">Load results</button><button class="btn small ghost" type="button" id="sample">Load sample results</button><button class="btn small ghost" type="button" id="cancel">Cancel</button></div>`
  const ta = $('#draft') as HTMLTextAreaElement
  ta.addEventListener('input', () => { state.importDraft = ta.value })
  $('#load').addEventListener('click', () => {
    const parsed = parseResults(ta.value)
    if (parsed.results.length === 0) { state.importErrors = parsed.errors.length ? parsed.errors : [{ row: 0, message: 'No results found' }]; render(); $('#draft').focus(); return }
    state = fromText(ta.value, 'own', state.setup)!
    state.importErrors = parsed.errors
    const note = `Loaded ${parsed.results.length} results for ${parsed.teams.length} teams.${parsed.errors.length ? ` These ${parsed.errors.length} row${parsed.errors.length === 1 ? ' was' : 's were'} skipped:` : ''}`
    if (parsed.errors.length) { state.importOpen = true; state.importDraft = ta.value; state.importNote = note }
    render()
    say(note.replace(/:$/, '.'))
  })
  $('#sample').addEventListener('click', () => reset())
  $('#cancel').addEventListener('click', () => { state.importOpen = false; state.importNote = ''; render(); $('#own').focus() })
}

function renderSlots(): void {
  const el = $('#slots')
  const s = state.setup
  const n = slotsFor(s).length
  el.innerHTML = `<h2 id="slots-h">Pitch slots</h2>
    <p class="small muted"><b class="num">${n}</b> slots per Saturday across ${s.venues.length} venue${s.venues.length === 1 ? '' : 's'}.</p>
    ${state.source === 'own' && JSON.stringify(s) === JSON.stringify(sampleSetup()) ? '<p class="small hint">These are the sample\'s grounds, times and date. Set your own before you generate: the export uses these venue names.</p>' : ''}
    ${s.venues.map((v, vi) => `<div class="venue">
      <label class="sr-only" for="vname-${vi}">Venue ${vi + 1} name</label>
      <input class="vname" id="vname-${vi}" data-vname="${vi}" type="text" value="${esc(v.name)}" autocomplete="off">
      <span class="stepper" role="group" aria-label="Pitches at ${esc(v.name)}"><button type="button" data-v="${vi}" data-d="-1" aria-label="Remove a pitch at ${esc(v.name)}">−</button><output class="num" aria-live="off">${v.pitches.length}</output><span class="small muted">pitches</span><button type="button" data-v="${vi}" data-d="1" aria-label="Add a pitch at ${esc(v.name)}">+</button></span>
      ${s.venues.length > 1 ? `<button type="button" class="icon-x" id="rm-venue-${vi}" data-rmvenue="${vi}" aria-label="Remove venue ${esc(v.name)}" title="Remove venue">×</button>` : ''}
    </div>`).join('')}
    <div class="row"><button type="button" class="btn small ghost" id="add-venue" ${s.venues.length >= 6 ? 'aria-disabled="true"' : ''}>Add a venue</button></div>
    <div class="field"><label for="times">Kick-off times</label><input id="times" type="text" inputmode="numeric" value="${esc(s.times.join(', '))}" autocomplete="off" aria-describedby="times-help${state.setupError.startsWith('times:') ? ' setup-error' : ''}"><span id="times-help" class="caption">24-hour, comma-separated</span></div>
    <div class="field"><label for="first">First Saturday</label><select id="first">${saturdayOptions(s.firstSaturday).map(d => `<option value="${d}"${d === s.firstSaturday ? ' selected' : ''}>${toUk(d)}</option>`).join('')}</select></div>
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
    if (FORMULA_START.test(name)) return setError(`vname: ${name} starts with =, +, - or @ and would run as a spreadsheet formula in the export.`)
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
  ;($('#first') as HTMLSelectElement).addEventListener('change', e => {
    s.firstSaturday = (e.target as HTMLSelectElement).value; state.setupError = ''; markStale(); render()
    say(`The block starts ${toUk(s.firstSaturday)}.`)
  })
}

function renderBands(): void {
  const el = $('#bands')
  const names = exportNames()
  const moved = movedTeams(state.bands, state.recordedDivision, names)
  const auto = state.proposedNames
  const most = maxBands(state.parsed.teams.length)
  el.innerHTML = `<h2 id="bands-h">Bands by goals per game</h2>
    <p class="small muted">Ranked by goal difference per game${new Set(state.recordedDivision.values()).size > 1 ? `, with each division above counted as ${DIVISION_GAP} goals a game stronger` : ''}. Spread is the gap between a band's strongest and weakest team. Drag teams between bands, or use the arrows. <b class="num">${moved}</b> team${moved === 1 ? '' : 's'} change division; each shows the one it was in.</p>
    ${state.parsed.teams.length > 1 && new Set([...state.stats.values()].map(t => t.gdPerGame)).size === 1 ? '<p class="small hint">Every team has the same goal difference per game, so the results can\'t rank them and the bands below are in name order. Move teams by hand.</p>' : ''}
    <div class="field band-count"><span id="bc-label">Bands</span><span class="stepper" role="group" aria-labelledby="bc-label"><button type="button" id="bc-down" aria-label="One band fewer"${state.bandCount <= 1 ? ' aria-disabled="true"' : ''}>−</button><output class="num" aria-live="off">${state.bandCount}</output><button type="button" id="bc-up" aria-label="One band more"${state.bandCount >= most ? ' aria-disabled="true"' : ''}>+</button></span><span class="caption">Changing the count re-proposes the bands and clears your moves.</span></div>
    ${state.bands.map((b, bi) => {
      const spread = bandSpread(b, state.stats, state.levelOf)
      const exportAs = names.get(b.id) ?? b.name
      const needsName = auto.get(b.id) === b.name
      const nameField = needsName ? `<span class="div-name"><label for="dn-${b.id}">Full-Time division</label><input id="dn-${b.id}" data-divname="${b.id}" type="text" autocomplete="off" value="${esc(state.divisionOverride.get(b.id) ?? '')}" placeholder="e.g. Division ${bi + 1}"${exportAs === b.name ? ' aria-invalid="true" aria-describedby="dn-help-' + b.id + '"' : ''}>${exportAs === b.name ? `<span class="caption" id="dn-help-${b.id}">Your results have no division for this band: name it as it appears in Full-Time.</span>` : ''}</span>` : ''
      return `<section class="band" data-band="${b.id}" aria-labelledby="bh-${b.id}"><div class="band-head"><h3 id="bh-${b.id}"><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${b.name.slice(-1)}</span>${esc(b.name)}</h3><span class="spread num">${b.teamIds.length} team${b.teamIds.length === 1 ? '' : 's'}${b.teamIds.length % 2 && b.teamIds.length > 1 ? ' (one bye a week)' : ''}, spread ${spread.toFixed(2)}</span>${!needsName ? `<span class="exports">exports as ${esc(exportAs)}</span>` : nameField}</div>
        <ul class="band-list" data-band="${b.id}" aria-label="${esc(b.name)}">${b.teamIds.map(id => {
          const s = state.stats.get(id)!
          const was = state.recordedDivision.get(id)
          const tag = was && was !== exportAs ? `<span class="was">was ${esc(was)}</span>` : ''
          return `<li class="team" draggable="true" data-id="${id}"><span class="handle" aria-hidden="true">⠿</span><span class="name">${esc(teamName(id))}${tag}</span>${statCell(s, state.levelOf(id), was)}<span class="move">${bi > 0 ? `<button type="button" data-up="${id}" aria-label="Move ${esc(teamName(id))} up to ${esc(state.bands[bi - 1].name)}">↑</button>` : ''}${bi < state.bands.length - 1 ? `<button type="button" data-down="${id}" aria-label="Move ${esc(teamName(id))} down to ${esc(state.bands[bi + 1].name)}">↓</button>` : ''}</span></li>`
        }).join('')}</ul></section>`
    }).join('')}`
  const setCount = (n: number): void => {
    if (n < 1 || n > most || n === state.bandCount) return
    state.bandCount = n; state.bands = proposeBands([...state.stats.values()], n, state.levelOf)
    state.proposedNames = divisionNames(state.bands, state.recordedDivision); state.divisionOverride.clear(); markStale(); render()
    say(`${n} band${n === 1 ? '' : 's'} proposed.`)
  }
  $('#bc-down').addEventListener('click', () => setCount(state.bandCount - 1))
  $('#bc-up').addEventListener('click', () => setCount(state.bandCount + 1))
  el.querySelectorAll<HTMLInputElement>('input[data-divname]').forEach(inp => inp.addEventListener('change', () => {
    const id = inp.dataset.divname!, name = inp.value.trim()
    if (FORMULA_START.test(name)) { say(`${name} starts with =, +, - or @ and would run as a spreadsheet formula; not used.`); render(); return }
    if (name) state.divisionOverride.set(id, name); else state.divisionOverride.delete(id)
    markStale(); render()
    say(name ? `${state.bands.find(b => b.id === id)?.name} exports as ${name}.` : 'Division name cleared.')
  }))
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
  const why = $('#why')
  const bad = c && (c.clashes > 0 || c.repeats > 0 || c.maxHomeAwayGap > 1)
  // a red chip says what went wrong and where: the band lines of the solver log that relaxed a rule
  const lines = bad ? state.block!.log.filter(l => /relaxed|[1-9]\d* repeat/.test(l)) : []
  why.hidden = !bad
  why.innerHTML = bad ? `${lines.map(l => esc(l)).join('<br>')}${lines.length ? '<br>' : ''}Small bands run out of new opponents: fewer, larger bands (Bands −) avoid this.` : ''
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
  // a block is drawn in the slots it was generated for; the current setup applies from the next Generate (the stale line says so)
  const setup = block?.setup ?? state.setup
  const wk = block ? block.fixtures.filter(f => f.week === state.week) : []
  const by = new Map<string, Fixture>()
  for (const f of wk) by.set(`${f.venue}|${f.pitch}|${f.time}`, f)
  const bandIdx = (bandId: string): number => Math.max(0, state.bands.findIndex(b => b.id === bandId))
  const date = block ? (wk[0]?.date ?? '') : setup.firstSaturday
  let order = 0
  const perWeek = state.bands.reduce((a, b) => a + Math.floor(b.teamIds.length / 2), 0)
  const intro = block ? '' : `<p class="grid-first"><strong>Generate to fill ${setup.weeks} weeks.</strong> ${perWeek} fixtures a week into ${slotsFor(setup).length} slots.</p>`
  el.innerHTML = intro + setup.venues.map(v => `<div class="gtable" role="region" aria-label="${esc(v.name)} fixtures" tabindex="0"><table class="grid${block ? '' : ' empty'}">
    <caption class="venue-h">${esc(v.name)}</caption>
    <thead><tr><th scope="col" class="date-h">${date ? esc(toUk(date)) : ''}</th>${v.pitches.map(p => `<th scope="col" class="pitch-h">${MINI}${esc(p)}</th>`).join('')}</tr></thead>
    <tbody>${setup.times.map(time => `<tr><th scope="row" class="time num">${time}</th>${v.pitches.map(p => {
      if (!block) return `<td class="cell"><span class="empty-cell" aria-hidden="true">—</span><span class="sr-only">empty</span></td>`
      const f = by.get(`${v.name}|${p}|${time}`)
      if (!f) return `<td class="cell"><span class="empty-cell">free</span></td>`
      const i = order++
      const bi = bandIdx(f.band)
      const band = state.bands[bi]?.name ?? f.division
      return `<td class="cell"><div class="fx ${state.animate ? 'enter' : ''}" style="animation-delay:${i * 40}ms"><div class="pair"><span class="swatch ${BAND_CLASS[bi]}" aria-hidden="true">${esc(band.slice(-1))}</span><span class="sr-only">${esc(band)}: </span><span class="tn" title="${esc(teamName(f.homeId))}">${esc(teamName(f.homeId))}</span></div><div class="pair"><span class="swatch vs" aria-hidden="true">v</span><span class="sr-only"> versus </span><span class="tn" title="${esc(teamName(f.awayId))}">${esc(teamName(f.awayId))}</span></div></div></td>`
    }).join('')}</tr>`).join('')}</tbody></table></div>`).join('')
}

/** The Saturdays a block can start on: from this coming Saturday (or the current choice, if earlier) for 30 weeks. */
function saturdayOptions(current: string): string[] {
  const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + ((6 - d.getDay() + 7) % 7)))
  const next = t.toISOString().slice(0, 10)
  const start = current && current < next ? current : next
  const out = Array.from({ length: 30 }, (_, i) => saturday(start, i))
  if (current && !out.includes(current)) out.push(current)
  return out
}

function toUk(iso: string, withDay = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  const day = new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
  return withDay ? `${day} ${d}/${m}/${y}` : `${d}/${m}/${y}`
}

function renderByes(): void {
  const el = $('#byes')
  if (!state.block || state.block.byes.length === 0) { el.innerHTML = ''; return }
  const wk = state.block.byes.filter(b => b.week === state.week)
  const bandOf = (id: string): string => state.bands.find(b => b.teamIds.includes(id))?.name ?? ''
  el.innerHTML = `<p class="byes"><b>Bye this Saturday:</b> ${wk.map(b => `${esc(teamName(b.teamId))} (${esc(bandOf(b.teamId))})`).join(', ') || 'none'}. <span class="muted">Bands with an odd number of teams rest one team each week, in turn.</span></p>`
}

function renderUnscheduled(): void {
  const el = $('#unscheduled')
  if (!state.block || state.block.unscheduled.length === 0) { el.innerHTML = ''; return }
  const b = state.block
  const thisWeek = b.unscheduled.filter(u => u.week === state.week)
  const pitches = b.setup.venues.reduce((a, v) => a + v.pitches.length, 0)
  const advice = shortfallAdvice(b.neededPerWeek, b.slotsPerWeek, b.setup.times.length, pitches)
  el.innerHTML = `<div class="unsched" role="alert"><h3>${thisWeek.length} fixture${thisWeek.length === 1 ? '' : 's'} don't fit this Saturday</h3>
    <p>${b.neededPerWeek} fixtures are needed each Saturday and there are ${b.slotsPerWeek} slots: ${b.unscheduled.length} don't fit across the ${b.setup.weeks} weeks. ${advice}</p>
    <ul>${thisWeek.map(u => `<li>${esc(teamName(u.homeId))} v ${esc(teamName(u.awayId))} (${esc(state.bands.find(x => x.id === u.band)?.name ?? u.division)})</li>`).join('')}${thisWeek.length === 0 ? '<li>None this week</li>' : ''}</ul></div>`
}

function renderExport(): void {
  const el = $('#export')
  if (!state.block || state.block.fixtures.length === 0) { el.innerHTML = ''; el.hidden = true; return }
  el.hidden = false
  const rows = [...state.block.fixtures].sort((a, b) => a.week - b.week || a.time.localeCompare(b.time) || a.venue.localeCompare(b.venue) || a.pitch.localeCompare(b.pitch)).slice(0, 8)
  const b = state.block
  const unnamed = new Set(unnamedBands().map(x => x.id))
  const stillBand = [...new Set(b.fixtures.filter(f => unnamed.has(f.band) || f.division === state.bands.find(x => x.id === f.band)?.name).map(f => f.division))]
  const notes = [
    state.stale ? '<p class="reason" role="alert">This file is from before your changes. Regenerate first.</p>' : '',
    b.unscheduled.length ? `<p class="small">${b.fixtures.length} of ${b.fixtures.length + b.unscheduled.length} fixtures: the ${b.unscheduled.length} that don't fit are not in this file.</p>` : '',
    stillBand.length ? `<p class="small warn">${stillBand.map(esc).join(', ')} ${stillBand.length === 1 ? 'is' : 'are'} not a Full-Time division: name ${stillBand.length === 1 ? 'it' : 'them'} on the band${stillBand.length === 1 ? '' : 's'}, then regenerate.</p>` : '',
  ].join('')
  el.innerHTML = `<h2 id="export-h">Export</h2><p class="small muted">fixtureupload.csv in the Full-Time uploader's nine-column layout (FA guide v5.1), each band under its division name. Showing 8 of ${b.fixtures.length} rows.</p>${notes}
    <div class="csv" role="region" aria-label="CSV preview" tabindex="0"><table><thead><tr>${UPLOADER_COLUMNS.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(f => `<tr>${fixtureRow(f, teamName).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="row"><button class="btn" type="button" id="download">Download fixtureupload.csv</button><button class="btn ghost" type="button" id="copy">Copy CSV</button></div>`
  const csv = toUploaderCsv(state.block, teamName)
  if (state.stale) for (const id of ['#download', '#copy']) $(id).setAttribute('aria-disabled', 'true')
  const blocked = (): boolean => { if (state.stale) say('This file is from before your changes. Regenerate first.'); return state.stale }
  $('#download').addEventListener('click', () => {
    if (blocked()) return
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fixtureupload.csv'; document.body.appendChild(a); a.click(); a.remove()
    const b = $('#download'); b.textContent = 'Downloaded'; say('fixtureupload.csv downloaded.'); setTimeout(() => { b.textContent = 'Download fixtureupload.csv' }, 2000)
  })
  $('#copy').addEventListener('click', async () => {
    if (blocked()) return
    const c = $('#copy')
    try { await navigator.clipboard.writeText(csv); c.textContent = 'Copied'; say('CSV copied.') } catch { c.textContent = 'Copy failed, use Download'; say('Copy failed; use Download.') }
    setTimeout(() => { c.textContent = 'Copy CSV' }, 2000)
  })
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
