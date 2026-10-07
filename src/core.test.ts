import { describe, expect, it } from 'vitest';
import { exportCSV, exportJSON, haversine, ImportSession, MAX_BYTES, measure, parseGPX, project, safeCSV } from './core';
import { demoGPX } from './demo';
import { localizeError } from './i18n';

const gpx = (body: string, ns = 'http://www.topografix.com/GPX/1/1') => `<gpx xmlns="${ns}" version="1.1"><trk><name>Test</name>${body}</trk></gpx>`;
const point = (lat: string | number, lon: string | number, data = '') => `<trkpt lat="${lat}" lon="${lon}">${data}</trkpt>`;
const segment = (body: string) => `<trkseg>${body}</trkseg>`;

describe('GPX parsing boundaries', () => {
  it('accepts 1.0, 1.1, prefixed namespaces, and unnamespaced tracks', () => {
    for (const namespace of ['', 'http://www.topografix.com/GPX/1/0', 'http://www.topografix.com/GPX/1/1']) {
      expect(parseGPX(gpx(segment(point(0, 0)), namespace)).points).toHaveLength(1);
    }
    expect(parseGPX('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:trk><g:trkseg><g:trkpt lat="1" lon="2"/></g:trkseg></g:trk></g:gpx>').points).toHaveLength(1);
  });
  it('does not read extension nodes or merge non-track shapes', () => {
    const body = `<trkseg>${point(0, 0)}<x:trkpt xmlns:x="urn:other" lat="1" lon="1"/></trkseg><extensions>${segment(point(2, 2))}</extensions>`;
    expect(parseGPX(gpx(body)).points).toHaveLength(1);
    expect(() => parseGPX('<gpx><rte><rtept lat="0" lon="0"/></rte></gpx>')).toThrow(/No track/);
  });
  it('rejects malformed XML, wrong roots, and DTDs', () => {
    expect(() => parseGPX('<gpx><trk></gpx>')).toThrow(/XML/);
    expect(() => parseGPX('<html/>')).toThrow(/Expected a GPX/);
    expect(() => parseGPX('<!DOCTYPE gpx [<!ENTITY x "test">]><gpx/>')).toThrow(/entities/);
    expect(() => parseGPX(gpx(segment(point(0, 0)), 'urn:other'))).toThrow();
  });
  it.each(['', 'NaN', 'Infinity', '1bad', '1e999', '0x12'])('rejects invalid numeric value %s', value => {
    expect(() => parseGPX(gpx(segment(point(value, 0))))).toThrow(/latitude/);
    expect(() => parseGPX(gpx(segment(point(0, 0, `<ele>${value}</ele>`))))).toThrow(/elevation/);
  });
  it('rejects absent and out-of-range coordinates instead of silently bridging', () => {
    expect(() => parseGPX(gpx(segment(`${point(0, 0)}<trkpt lon="1"/>${point(0, 2)}`)))).toThrow();
    expect(() => parseGPX(gpx(segment(point(91, 0))))).toThrow(/Coordinates/);
    expect(() => parseGPX(gpx(segment(point(0, 181))))).toThrow(/Coordinates/);
  });
  it('rejects impossible dates and timezone-free timestamps', () => {
    for (const time of ['2026-02-30T12:00:00Z', '2026-13-01T00:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T12:00:00', '2026-01-01T00:00:00+99:00']) {
      expect(() => parseGPX(gpx(segment(point(0, 0, `<time>${time}</time>`))))).toThrow(/timestamp/);
    }
    expect(parseGPX(gpx(segment(point(0, 0, '<time>2024-02-29T12:00:00+08:00</time>')))).points[0].time).toBe(Date.parse('2024-02-29T04:00:00Z'));
  });
  it('bounds decoded import memory before constructing the XML document', () => {
    expect(() => parseGPX(' '.repeat(MAX_BYTES + 1))).toThrow(/10 MiB/);
    expect(() => parseGPX('界'.repeat(Math.ceil(MAX_BYTES / 3)))).toThrow(/10 MiB/);
  });
  it('bounds segment count and extreme elevations before rendering or aggregation', () => {
    expect(() => parseGPX(gpx(segment(point(0, 0)).repeat(1001)))).toThrow(/1,000-segment/);
    expect(() => parseGPX(gpx(segment(point(0, 0, '<ele>1e308</ele>'))))).toThrow(/Elevation exceeds/);
  });
  it('skips empty segments without corrupting point segment IDs', () => {
    const track = parseGPX(gpx(segment('') + segment(point(0, 0)) + segment('') + segment(point(1, 1))));
    expect(track.segments).toHaveLength(2);
    expect(track.points.map(p => p.segment)).toEqual([0, 1]);
    expect(measure(track.points).distance).toBe(0);
  });
});

describe('honest measurements', () => {
  it('excludes segment gaps from distance, elevation, and elapsed time', () => {
    const data = (ele: number, time: string) => `<ele>${ele}</ele><time>2026-01-01T${time}Z</time>`;
    const track = parseGPX(gpx(segment(point(0, 0, data(10, '00:00:00')) + point(0, .001, data(20, '00:01:00'))) +
      segment(point(10, 10, data(1000, '01:00:00')) + point(10, 10.001, data(990, '01:02:00')))));
    const summary = measure(track.points);
    expect(summary.distance).toBeGreaterThan(220); expect(summary.distance).toBeLessThan(222);
    expect(summary.ascent).toBe(10); expect(summary.descent).toBe(10);
    expect(summary.elapsed).toBe(180_000); expect(summary.totalPairs).toBe(2);
    expect(track.points[2].distance).toBe(track.points[1].distance);
  });
  it('preserves unknown fields instead of substituting zero', () => {
    const track = parseGPX(gpx(segment(point(0, 0) + point(0, 1))));
    expect(track.points[0].elevation).toBeNull(); expect(track.points[0].time).toBeNull();
    expect(measure(track.points)).toMatchObject({ ascent: null, descent: null, elapsed: null, minElevation: null, elevationPairs: 0, timedPairs: 0 });
  });
  it('never bridges missing elevation and exposes partial coverage', () => {
    const track = parseGPX(gpx(segment(point(0, 0, '<ele>0</ele>') + point(0, .001) + point(0, .002, '<ele>100</ele>') + point(0, .003, '<ele>105</ele>'))));
    expect(measure(track.points)).toMatchObject({ ascent: 5, elevationPairs: 1, totalPairs: 3 });
  });
  it('excludes repeated or backward timestamps, and does not bridge missing time', () => {
    const times = ['00:00:00', '00:01:00', '00:01:00', '00:00:30', null, '00:10:00'];
    const track = parseGPX(gpx(segment(times.map((time, i) => point(0, i * .001, time ? `<time>2026-01-01T${time}Z</time>` : '')).join(''))));
    expect(measure(track.points)).toMatchObject({ elapsed: 60_000, timedPairs: 1, nonIncreasingTimes: 2, totalPairs: 5 });
  });
  it('uses short great-circle distance across the antimeridian', () => {
    expect(haversine({ lat: 0, lon: 179.999 }, { lat: 0, lon: -179.999 })).toBeCloseTo(222.39016, 3);
    expect(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(Math.PI * 6_371_008.8, 3);
  });
  it('projects opposite-direction antimeridian segments into the same frame', () => {
    const track = parseGPX(gpx(segment(point(0, 179.9) + point(0, -179.9)) + segment(point(.1, -179.9) + point(.1, 179.9))));
    const projected = project(track, 600, 400);
    expect(projected[0][0].x).toBeCloseTo(projected[1][1].x);
    expect(projected[0][1].x).toBeCloseTo(projected[1][0].x);
    expect(projected.flat().every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
  it('handles one point and coincident points without non-finite plotting coordinates', () => {
    const track = parseGPX(gpx(segment(point(90, 180))));
    expect(project(track, 600, 400)[0][0]).toMatchObject({ x: 300, y: 200 });
    expect(measure(track.points).distance).toBe(0);
  });
  it('exports selected points and original cumulative distance with units', () => {
    const track = parseGPX(demoGPX());
    const json = JSON.parse(exportJSON(track, 4, 9));
    expect(json.points).toHaveLength(6); expect(json.selection).toEqual({ firstPoint: 5, lastPoint: 10 });
    expect(json.points[0].distance).toBe(track.points[4].distance);
    expect(json.summary.distance).toBeCloseTo(track.points[9].distance - track.points[4].distance);
    expect(exportCSV(track, 4, 9).split('\r\n')).toHaveLength(7);
    expect(json.units.distance).toBe('m');
  });
  it('protects spreadsheet strings while preserving negative numeric coordinates', () => {
    expect(safeCSV('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(safeCSV(' \t@cmd')).toBe('"\' \t@cmd"');
    expect(safeCSV(-12.5)).toBe('-12.5'); expect(safeCSV(null)).toBe('');
    expect(safeCSV('a"b')).toBe('"a""b"');
  });
  it('generates the same honestly labelled demo every time', () => {
    expect(demoGPX()).toBe(demoGPX());
    expect(demoGPX()).toContain('Synthetic demonstration');
    expect(parseGPX(demoGPX()).points).toHaveLength(401);
  });
});

describe('import lifecycle', () => {
  it('keeps the newest import when an older read finishes late', async () => {
    const session = new ImportSession();
    let resolve!: (value: string) => void;
    let display = 'initial';
    const first = session.load(() => new Promise<string>(r => { resolve = r; }), 'old.gpx', track => { display = track.name; }, () => { display = 'error'; });
    await session.load(async () => gpx(segment(point(1, 1))).replace('Test', 'new'), 'new.gpx', track => { display = track.name; }, () => {});
    resolve(demoGPX()); await first;
    expect(display).toBe('new');
  });
  it('retains the displayed track on failure and ignores older failures', async () => {
    const session = new ImportSession();
    let reject!: (error: Error) => void, issue = '';
    const first = session.load(() => new Promise<string>((_, fail) => { reject = fail; }), 'old.gpx', () => {}, () => { issue = 'stale'; });
    await session.load(async () => '<not-gpx/>', 'bad.gpx', () => { throw new Error('Must not replace displayed data'); }, error => { issue = error.message; });
    reject(new Error('Old failed read')); await first;
    expect(issue).toMatch(/Expected a GPX/);
  });
  it('cancels pending reads when switching back to the demo', async () => {
    const session = new ImportSession(); let resolve!: (value: string) => void, commits = 0;
    const pending = session.load(() => new Promise<string>(r => { resolve = r; }), 'old.gpx', () => commits++, () => {});
    session.cancel(); resolve(demoGPX()); await pending; expect(commits).toBe(0);
  });
  it('translates parser errors into Traditional Chinese', () => {
    for (const invalid of ['<html/>', gpx(segment(point('oops', 1))), gpx(segment(point(91, 1)))]) {
      try { parseGPX(invalid); } catch (error) {
        expect(localizeError((error as Error).message, 'zh-TW')).toMatch(/[\u4e00-\u9fff]/);
      }
    }
  });
});
