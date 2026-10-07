import './style.css';
import { exportCSV, exportJSON, ImportSession, MAX_BYTES, measure, parseGPX, project, type Point, type Track } from './core';
import { demoGPX } from './demo';
import { localizeError, strings, type Language } from './i18n';

const app = document.querySelector<HTMLDivElement>('#app')!;
function preference(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function save(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ } }
let language: Language = preference('switchback-language') === 'en' ? 'en' : 'zh-TW';
let imperial = preference('switchback-units') === 'imperial';
let track = parseGPX(demoGPX());
let synthetic = true;
let active = 0, rangeStart = 0, rangeEnd = track.points.length - 1;
let status = '', error = '', reading = false;
const imports = new ImportSession();
const esc = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const number = (value: number, digits = 0) => value.toLocaleString(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const distance = (meters: number) => `${number(meters / (imperial ? 1609.344 : 1000), 2)} <span>${imperial ? 'mi' : 'km'}</span>`;
const height = (meters: number | null) => meters === null ? '—' : `${number(meters * (imperial ? 3.280839895 : 1))} <span>${imperial ? 'ft' : 'm'}</span>`;
const plainHeight = (meters: number | null) => meters === null ? strings(language).unknown : `${number(meters * (imperial ? 3.280839895 : 1))} ${imperial ? 'ft' : 'm'}`;
const duration = (ms: number | null) => ms === null ? '—' : `${Math.floor(ms / 3_600_000)}<span>${language === 'zh-TW' ? '時' : 'h'}</span> ${Math.floor(ms / 60_000) % 60}<span>${language === 'zh-TW' ? '分' : 'm'}</span> ${Math.floor(ms / 1_000) % 60}<span>${language === 'zh-TW' ? '秒' : 's'}</span>`;
const path = (points: { x: number; y: number }[]) => points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');

function routeSVG(): string {
  const s = strings(language), projected = project(track, 680, 420, 54);
  const step = Math.max(1, Math.ceil(track.points.length / 1200));
  let full = '', selected = '';
  let current = projected[0][0], first = projected[0][0], last = projected.at(-1)!.at(-1)!;
  for (const segment of projected) {
    const samples = segment.filter((value, i) => i === 0 || i === segment.length - 1 || value.point.index % step === 0);
    full += `${path(samples)} `;
    const included = segment.filter(value => value.point.index >= rangeStart && value.point.index <= rangeEnd);
    selected += `${path(included.filter((value, i) => i === 0 || i === included.length - 1 || value.point.index % step === 0))} `;
    const candidate = segment.find(value => value.point.index === active);
    if (candidate) current = candidate;
  }
  return `<svg id="route-plot" viewBox="0 0 680 420" role="img" aria-label="${s.routeAria}">
    <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="currentColor" stroke-width=".45"/></pattern></defs>
    <rect width="680" height="420" fill="url(#grid)" opacity=".13"/>
    <path d="${full}" fill="none" stroke="#bcc9b5" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${selected}" fill="none" stroke="#254c3e" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${first.x}" cy="${first.y}" r="6" fill="#f8f6ef" stroke="#254c3e" stroke-width="2"/>
    <circle cx="${last.x}" cy="${last.y}" r="3" fill="#254c3e"/>
    <circle cx="${current.x}" cy="${current.y}" r="13" fill="#d89d50" opacity=".24"/>
    <circle cx="${current.x}" cy="${current.y}" r="5.5" fill="#d89d50" stroke="#f8f6ef" stroke-width="2"/>
    <g transform="translate(632 48)"><path d="M0 19V-9M-4-2L0-10 4-2" fill="none" stroke="#466052" stroke-width="1.5"/><text y="-20" text-anchor="middle" class="svg-note">${s.north}</text></g>
    <text x="23" y="398" class="svg-note">${s.schematic}</text>
  </svg>`;
}

function profileSVG(): string {
  const s = strings(language), summary = measure(track.points);
  if (summary.minElevation === null) return `<div class="no-data">${s.noElevation}</div>`;
  const width = 940, heightPx = 190, left = 48, right = 22, top = 20, bottom = 35;
  const min = summary.minElevation, max = summary.maxElevation!;
  const span = Math.max(max - min, 10), low = min - span * .12, high = max + span * .12;
  const total = track.points.at(-1)!.distance;
  const x = (point: Point) => left + (total ? point.distance / total : point.index / Math.max(1, track.points.length - 1)) * (width - left - right);
  const y = (ele: number) => top + (high - ele) / (high - low) * (heightPx - top - bottom);
  const step = Math.max(1, Math.ceil(track.points.length / 1200));
  let line = '', needsMove = true;
  for (let i = 0; i < track.points.length; i++) {
    const point = track.points[i], previous = track.points[i - 1];
    if (!previous || previous.segment !== point.segment || point.elevation === null) needsMove = true;
    if (point.elevation === null) continue;
    if (i % step !== 0 && i !== track.points.length - 1 && i !== active) continue;
    line += `${needsMove ? 'M' : 'L'}${x(point).toFixed(2)},${y(point.elevation).toFixed(2)} `;
    needsMove = false;
  }
  const cursor = track.points[active], cx = x(cursor);
  const ticks = [0, .5, 1].map(t => {
    const ele = min + (max - min) * t, py = y(ele);
    return `<path d="M${left} ${py}H${width - right}" stroke="#d8dbcc" stroke-dasharray="3 5"/><text x="${left - 10}" y="${py + 4}" text-anchor="end" class="svg-note">${number(ele * (imperial ? 3.280839895 : 1))}</text>`;
  }).join('');
  return `<svg id="elevation-plot" viewBox="0 0 ${width} ${heightPx}" role="img" aria-label="${s.elevationAria}">
    <rect x="${x(track.points[rangeStart])}" y="${top}" width="${Math.max(1, x(track.points[rangeEnd]) - x(track.points[rangeStart]))}" height="${heightPx - top - bottom}" fill="#e3e8d5" opacity=".55"/>
    ${ticks}<path d="${line}" fill="none" stroke="#345748" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${cx} ${top}V${heightPx - bottom}" stroke="#b4803c" stroke-width="1" stroke-dasharray="3 4"/>
    ${cursor.elevation === null ? '' : `<circle cx="${cx}" cy="${y(cursor.elevation)}" r="4.5" fill="#c59148" stroke="#faf8f1" stroke-width="2"/>`}
    <text x="${left}" y="${heightPx - 9}" class="svg-note">0</text><text x="${width - right}" y="${heightPx - 9}" text-anchor="end" class="svg-note">${number(total / (imperial ? 1609.344 : 1000), 2)} ${imperial ? 'mi' : 'km'}</text>
    <text x="3" y="12" class="svg-note">${imperial ? 'ft' : 'm'}</text>
  </svg>`;
}

function render(focusId?: string): void {
  const openDetails = Array.from(app.querySelectorAll<HTMLDetailsElement>('details[open]')).map(element => element.className);
  const s = strings(language), selected = track.points.slice(rangeStart, rangeEnd + 1), stats = measure(selected), point = track.points[active];
  const full = rangeStart === 0 && rangeEnd === track.points.length - 1;
  document.documentElement.lang = language === 'zh-TW' ? 'zh-Hant' : 'en';
  document.title = language === 'zh-TW' ? 'Switchback — GPX 路線筆記' : 'Switchback — a GPX field notebook';
  const coverage = (valid: number) => `${number(valid)} / ${number(stats.totalPairs)} ${s.coverage}`;
  app.innerHTML = `<header class="site-header"><a class="brand" href="#" aria-label="Switchback"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 27h17c9 0 9-9 0-9H13c-9 0-9-9 0-9h16"/></svg><span>switchback<span class="brand-sub">${s.subtitle}</span></span></a>
    <div class="header-actions"><span class="privacy"><i></i>${s.local}</span><select id="language" aria-label="${s.language}"><option value="zh-TW" ${language === 'zh-TW' ? 'selected' : ''}>繁體中文</option><option value="en" ${language === 'en' ? 'selected' : ''}>English</option></select><button class="button primary" data-action="open"><span aria-hidden="true">↗</span> ${s.open}</button></div></header>
    <main><section class="intro"><div><p class="eyebrow">${s.notebook}</p><h1>${s.intro}</h1><p class="intro-copy">${s.introBody}</p></div><div class="folio"><span>01 /</span><p>GPX<br>${language === 'zh-TW' ? '路線筆記' : 'FIELD NOTES'}</p></div></section>
    <section class="notebook" aria-label="${s.notebook}"><div class="track-heading"><div><p class="eyebrow"><span class="dot"></span>${synthetic ? s.sample : s.yourTrack}</p><h2>${esc(synthetic ? s.demoName : track.name)}</h2><p>${synthetic ? s.sampleNote : s.importedNote}</p></div><div class="track-meta"><span>${number(track.points.length)} ${s.points}</span><span>${track.segments.length} ${s.segments}</span><fieldset class="unit-toggle"><legend class="sr-only">${s.units}</legend><button type="button" id="metric" data-action="metric" aria-pressed="${!imperial}">${s.metric}</button><button type="button" id="imperial" data-action="imperial" aria-pressed="${imperial}">${s.imperial}</button></fieldset></div></div>
    <div id="notice" class="notice ${error ? 'is-error' : ''}" role="status" aria-live="polite">${esc(error ? `${localizeError(error, language)} ${s.kept}` : reading ? s.reading : status ? s[status as keyof typeof s] : '')}</div>
    <div class="workspace"><div class="route-panel"><div class="panel-heading"><div><span class="section-index">01</span><h3>${s.route}</h3></div><span class="subtle">${s.routeSub}</span></div>${routeSVG()}<div class="route-caption"><span><i class="start-marker"></i>${s.start} / ${s.finish}</span><span>${s.gap}</span></div></div>
    <aside class="summary"><div class="summary-top"><span class="eyebrow">${full ? s.fullTrack : s.selected}</span><span class="selection-badge">${rangeStart + 1}–${rangeEnd + 1}</span></div><div class="distance-stat"><span>${s.distance}</span><strong>${distance(stats.distance)}</strong></div><div class="stat-pair"><div><span>${s.ascent}</span><strong><small>↗</small> ${height(stats.ascent)}</strong></div><div><span>${s.descent}</span><strong><small>↘</small> ${height(stats.descent)}</strong></div></div><p class="coverage">${coverage(stats.elevationPairs)}</p><div class="time-stat"><span>${s.elapsed}</span><strong>${duration(stats.elapsed)}</strong><p class="coverage">${coverage(stats.timedPairs)}${stats.nonIncreasingTimes ? `<br>${stats.nonIncreasingTimes} ${s.timeExcluded}` : ''}</p></div><div class="altitude-extremes"><div><span>${s.minElevation}</span><b>${height(stats.minElevation)}</b></div><div><span>${s.maxElevation}</span><b>${height(stats.maxElevation)}</b></div></div></aside></div>
    <section class="profile-panel"><div class="panel-heading"><div><span class="section-index">02</span><h3>${s.elevation}</h3></div><span class="subtle">${s.elevationSub}</span></div>${profileSVG()}<p class="plot-help">${s.inspect}</p></section>
    <section class="point-inspector"><div class="point-id"><span class="eyebrow">${s.point}</span><strong>${number(active + 1)}<small> ${s.of} ${number(track.points.length)}</small></strong></div><div class="point-slider"><label for="point-slider">${s.pointLabel}<span>${s.segment} ${point.segment + 1}</span></label><input id="point-slider" type="range" min="0" max="${track.points.length - 1}" value="${active}" aria-valuetext="${s.point} ${active + 1}, ${s.elevationLabel} ${plainHeight(point.elevation)}"/></div><dl class="point-values"><div><dt>${s.lat}</dt><dd>${point.lat.toFixed(5)}°</dd></div><div><dt>${s.lon}</dt><dd>${point.lon.toFixed(5)}°</dd></div><div><dt>${s.elevationLabel}</dt><dd>${plainHeight(point.elevation)}</dd></div><div><dt>${s.timestamp}</dt><dd>${point.time === null ? s.unknown : new Date(point.time).toISOString().replace('T', ' ').replace('.000Z', '')}</dd></div></dl></section>
    </section><div class="lower-grid"><section class="selection-panel"><div class="panel-heading"><div><span class="section-index">03</span><h3>${s.selection}</h3></div><button class="text-button" data-action="reset">${s.reset} ↺</button></div><p class="subtle">${s.selectionSub}</p><div class="range-fields"><label for="range-start">${s.from}<input id="range-start" type="number" min="1" max="${track.points.length}" value="${rangeStart + 1}"/></label><span>→</span><label for="range-end">${s.to}<input id="range-end" type="number" min="1" max="${track.points.length}" value="${rangeEnd + 1}"/></label></div><p class="small-copy">${s.rangeNote}</p><details class="segment-details"><summary>${s.segments}<span>${track.segments.length}</span></summary><div class="segment-list">${track.segments.map((segment, index) => `<button data-segment="${index}" title="${esc(segment.name)}"><span>${s.segment} ${index + 1}</span><span>${segment.points.length} ${s.points}</span><strong>${distance(measure(segment.points).distance)}</strong><span aria-hidden="true">↗</span></button>`).join('')}</div></details></section>
    <section class="export-panel"><span class="eyebrow">04 / ${s.export}</span><h3>${s.exportBody}</h3><div class="export-buttons"><button class="button" data-action="json">${s.exportJSON} <span aria-hidden="true">↓</span></button><button class="button" data-action="csv">${s.exportCSV} <span aria-hidden="true">↓</span></button></div><div class="demo-actions"><button class="text-button" data-action="download-demo">${s.demoDownload} ↗</button>${!synthetic ? `<button class="text-button" data-action="demo">${s.loadDemo}</button>` : ''}</div></section></div>
    <details class="methods"><summary><span>${s.methods}</span><span aria-hidden="true">＋</span></summary><div class="methods-body"><h3>${s.methodsIntro}</h3><p>${s.distanceMethod}</p><p>${s.elevationMethod}</p><p>${s.timeMethod}</p><p>${s.viewMethod}</p><p>${s.limitsMethod}</p><p>${s.privacyMethod}</p></div></details><p class="drop-hint">↗ ${s.drop}</p></main>
    <footer><span>switchback<span class="footer-note">${s.footer}</span></span><span>${s.localOnly}</span></footer><input id="file-input" class="sr-only" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" tabindex="-1" aria-label="${s.open}"/><div id="drop-overlay" hidden><div><span>↘</span><h2>${s.dropTitle}</h2><p>${s.drop}</p></div></div>`;
  for (const element of app.querySelectorAll<HTMLDetailsElement>('details')) if (openDetails.includes(element.className)) element.open = true;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

/** Keep the native range element mounted so pointer capture and keyboard repetition survive. */
function updateActivePoint(): void {
  const s = strings(language), point = track.points[active];
  document.getElementById('route-plot')!.outerHTML = routeSVG();
  const profile = document.getElementById('elevation-plot');
  if (profile) profile.outerHTML = profileSVG();
  document.querySelector('.point-id strong')!.innerHTML = `${number(active + 1)}<small> ${s.of} ${number(track.points.length)}</small>`;
  document.querySelector('.point-slider label span')!.textContent = `${s.segment} ${point.segment + 1}`;
  document.querySelector('.point-values')!.innerHTML = `<div><dt>${s.lat}</dt><dd>${point.lat.toFixed(5)}°</dd></div><div><dt>${s.lon}</dt><dd>${point.lon.toFixed(5)}°</dd></div><div><dt>${s.elevationLabel}</dt><dd>${plainHeight(point.elevation)}</dd></div><div><dt>${s.timestamp}</dt><dd>${point.time === null ? s.unknown : new Date(point.time).toISOString().replace('T', ' ').replace('.000Z', '')}</dd></div>`;
  document.getElementById('point-slider')!.setAttribute('aria-valuetext', `${s.point} ${active + 1}, ${s.elevationLabel} ${plainHeight(point.elevation)}`);
}

function commit(next: Track, demo = false): void {
  track = next; synthetic = demo; active = 0; rangeStart = 0; rangeEnd = track.points.length - 1;
  reading = false; error = ''; status = 'loaded'; render();
}

async function openFiles(files: FileList | File[]): Promise<void> {
  if (!files.length) return;
  if (files.length !== 1) { imports.cancel(); reading = false; error = 'Choose one GPX file at a time.'; status = ''; render(); return; }
  const file = files[0];
  if (file.size > MAX_BYTES) { imports.cancel(); reading = false; error = 'This file exceeds the 10 MiB limit.'; status = ''; render(); return; }
  reading = true; error = ''; status = ''; render();
  await imports.load(() => file.text(), file.name, next => commit(next), issue => { reading = false; error = issue.message; render(); });
}

function download(contents: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  status = 'exportDone'; error = ''; render();
}

function select(index: number, extend: boolean): void {
  if (extend) { rangeStart = Math.min(active, index); rangeEnd = Math.max(active, index); }
  active = index; render();
}

app.addEventListener('click', event => {
  const target = event.target as Element;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'open') document.querySelector<HTMLInputElement>('#file-input')!.click();
  if (action === 'metric' || action === 'imperial') { imperial = action === 'imperial'; save('switchback-units', action); render(action); }
  if (action === 'reset') { rangeStart = 0; rangeEnd = track.points.length - 1; render(); }
  if (action === 'demo') { imports.cancel(); commit(parseGPX(demoGPX()), true); }
  if (action === 'json') download(exportJSON(track, rangeStart, rangeEnd), 'switchback-notes.json', 'application/json');
  if (action === 'csv') download('\uFEFF' + exportCSV(track, rangeStart, rangeEnd), 'switchback-points.csv', 'text/csv;charset=utf-8');
  if (action === 'download-demo') download(demoGPX(), 'switchback-synthetic-demo.gpx', 'application/gpx+xml');
  const segment = target.closest<HTMLElement>('[data-segment]')?.dataset.segment;
  if (segment !== undefined) {
    const points = track.segments[Number(segment)].points;
    rangeStart = points[0].index; rangeEnd = points.at(-1)!.index; active = rangeStart; render();
  }
  const route = target.closest<SVGSVGElement>('#route-plot');
  if (route) {
    const matrix = route.getScreenCTM(); if (!matrix) return;
    const coordinate = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    let nearest = 0, best = Infinity;
    for (const segment of project(track, 680, 420, 54)) for (const value of segment) {
      const d = (value.x - coordinate.x) ** 2 + (value.y - coordinate.y) ** 2;
      if (d < best) { best = d; nearest = value.point.index; }
    }
    select(nearest, event.shiftKey);
  }
  const profile = target.closest<SVGSVGElement>('#elevation-plot');
  if (profile) {
    const matrix = profile.getScreenCTM(); if (!matrix) return;
    const coordinate = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const fraction = Math.max(0, Math.min(1, (coordinate.x - 48) / 870));
    const total = track.points.at(-1)!.distance;
    let nearest = 0, best = Infinity;
    for (const point of track.points) {
      const d = Math.abs((total ? point.distance / total : point.index / Math.max(1, track.points.length - 1)) - fraction);
      if (d < best) { best = d; nearest = point.index; }
    }
    select(nearest, event.shiftKey);
  }
});

app.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'point-slider') { active = Number(target.value); updateActivePoint(); }
});

app.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'file-input' && target.files) void openFiles(target.files);
  if (target.id === 'language') { language = target.value === 'en' ? 'en' : 'zh-TW'; save('switchback-language', language); render('language'); }
  if (target.id === 'range-start' || target.id === 'range-end') {
    const value = Math.max(0, Math.min(track.points.length - 1, Math.round(Number(target.value) || 1) - 1));
    if (target.id === 'range-start') { rangeStart = value; rangeEnd = Math.max(value, rangeEnd); }
    else { rangeEnd = value; rangeStart = Math.min(value, rangeStart); }
    render(target.id);
  }
});

let dragDepth = 0;
document.addEventListener('dragenter', event => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault(); dragDepth++; document.getElementById('drop-overlay')!.hidden = false;
});
document.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.getElementById('drop-overlay')!.hidden = true; } });
document.addEventListener('drop', event => {
  event.preventDefault(); dragDepth = 0; document.getElementById('drop-overlay')!.hidden = true;
  if (event.dataTransfer?.files) void openFiles(event.dataTransfer.files);
});
render();
