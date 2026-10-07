export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_POINTS = 100_000;
export const MAX_SEGMENTS = 1_000;
const EARTH_RADIUS_M = 6_371_008.8;
const GPX_NAMESPACES = ['', 'http://www.topografix.com/GPX/1/1', 'http://www.topografix.com/GPX/1/0'];

export interface Point {
  lat: number;
  lon: number;
  elevation: number | null;
  time: number | null;
  distance: number;
  segment: number;
  index: number;
}
export interface Segment { name: string; points: Point[] }
export interface Track { name: string; segments: Segment[]; points: Point[] }
export interface Measures {
  distance: number;
  ascent: number | null;
  descent: number | null;
  elevationPairs: number;
  totalPairs: number;
  elapsed: number | null;
  timedPairs: number;
  nonIncreasingTimes: number;
  minElevation: number | null;
  maxElevation: number | null;
}

export function haversine(a: Pick<Point, 'lat' | 'lon'>, b: Pick<Point, 'lat' | 'lon'>): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

function numberValue(raw: string | null, field: string): number {
  if (raw === null || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim())) {
    throw new Error(`Invalid ${field}. Every supplied value must be a finite number.`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${field}: number is out of range.`);
  return value;
}

function timestamp(raw: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(raw.trim());
  if (!match) throw new Error('Invalid timestamp. GPX times need an ISO date, time, and timezone.');
  const [, year, month, day, hour, minute, second, zone] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > days ||
      Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 ||
      (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) {
    throw new Error('Invalid timestamp: date or time is out of range.');
  }
  const parsed = Date.parse(raw.trim());
  if (!Number.isFinite(parsed)) throw new Error('Invalid timestamp.');
  return parsed;
}

export function parseGPX(text: string, fileName = 'Untitled track'): Track {
  if (text.length > MAX_BYTES || new TextEncoder().encode(text).length > MAX_BYTES) {
    throw new Error('This file exceeds the 10 MiB limit. Export a shorter track and try again.');
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) throw new Error('GPX files with document types or entities are not supported.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length || doc.getElementsByTagNameNS('*', 'parsererror').length) {
    throw new Error('This file is not valid XML. Check that it is a complete GPX export.');
  }
  const root = doc.documentElement;
  if (!root || root.localName !== 'gpx' || !GPX_NAMESPACES.includes(root.namespaceURI ?? '')) {
    throw new Error('Expected a GPX 1.0 or 1.1 document.');
  }
  const namespace = root.namespaceURI;
  const children = (el: Element, name: string): Element[] => Array.from(el.children)
    .filter(child => child.localName === name && child.namespaceURI === namespace);
  const value = (el: Element, name: string): string | null => children(el, name)[0]?.textContent ?? null;
  const points: Point[] = [];
  const segments: Segment[] = [];
  let distance = 0;
  for (const [trackIndex, track] of children(root, 'trk').entries()) {
    const trackName = value(track, 'name')?.trim().slice(0, 200) || `Track ${trackIndex + 1}`;
    for (const [segmentIndex, segment] of children(track, 'trkseg').entries()) {
      const local: Point[] = [];
      for (const element of children(segment, 'trkpt')) {
        if (points.length >= MAX_POINTS) throw new Error('This file exceeds the 100,000-point limit. Simplify the track and try again.');
        const lat = numberValue(element.getAttribute('lat'), 'latitude');
        const lon = numberValue(element.getAttribute('lon'), 'longitude');
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('Coordinates must be within ±90° latitude and ±180° longitude.');
        const elevationText = value(element, 'ele');
        const timeText = value(element, 'time');
        const elevation = elevationText === null ? null : numberValue(elevationText, 'elevation');
        if (elevation !== null && Math.abs(elevation) > 1_000_000) throw new Error('Elevation exceeds the supported range of ±1,000,000 m.');
        const point: Point = {
          lat, lon, elevation,
          time: timeText === null ? null : timestamp(timeText),
          distance, segment: segments.length, index: points.length,
        };
        if (local.length) distance += haversine(local[local.length - 1], point);
        point.distance = distance;
        local.push(point);
        points.push(point);
      }
      if (local.length) {
        if (segments.length >= MAX_SEGMENTS) throw new Error('This file exceeds the 1,000-segment limit. Split the file and try again.');
        segments.push({ name: `${trackName} · ${segmentIndex + 1}`, points: local });
      }
    }
  }
  if (!points.length) throw new Error('No track points found. Export a GPX track containing trk / trkseg / trkpt elements; route-only and waypoint-only files are not supported.');
  const metadata = children(root, 'metadata')[0];
  const name = (metadata && value(metadata, 'name')) || value(children(root, 'trk')[0], 'name') || fileName.replace(/\.gpx$/i, '');
  return { name: name.trim().slice(0, 200) || 'Untitled track', segments, points };
}

/** Only adjacent points inside the same segment contribute to pair-based totals. */
export function measure(points: Point[]): Measures {
  let distance = 0, ascent = 0, descent = 0, elevationPairs = 0, totalPairs = 0;
  let elapsed = 0, timedPairs = 0, nonIncreasingTimes = 0;
  let minElevation: number | null = null, maxElevation: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.elevation !== null) {
      minElevation = minElevation === null ? point.elevation : Math.min(minElevation, point.elevation);
      maxElevation = maxElevation === null ? point.elevation : Math.max(maxElevation, point.elevation);
    }
    const previous = points[i - 1];
    if (!previous || previous.segment !== point.segment || previous.index + 1 !== point.index) continue;
    totalPairs++;
    distance += haversine(previous, point);
    if (previous.elevation !== null && point.elevation !== null) {
      const difference = point.elevation - previous.elevation;
      ascent += Math.max(0, difference);
      descent += Math.max(0, -difference);
      elevationPairs++;
    }
    if (previous.time !== null && point.time !== null) {
      if (point.time > previous.time) { elapsed += point.time - previous.time; timedPairs++; }
      else nonIncreasingTimes++;
    }
  }
  return { distance, ascent: elevationPairs ? ascent : null, descent: elevationPairs ? descent : null,
    elevationPairs, totalPairs, elapsed: timedPairs ? elapsed : null, timedPairs,
    nonIncreasingTimes, minElevation, maxElevation };
}

export interface ProjectedPoint { x: number; y: number; point: Point }
/** Route-only equirectangular projection: a schematic, never a navigation map. */
export function project(track: Track, width: number, height: number, padding = 42): ProjectedPoint[][] {
  const meanLat = track.points.reduce((sum, point) => sum + point.lat, 0) / track.points.length;
  const anchor = track.points[0].lon;
  const wrap = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const projected = track.segments.map(segment => {
    let longitude = anchor + wrap(segment.points[0].lon - anchor);
    return segment.points.map((point, index) => {
      if (index) longitude += wrap(point.lon - segment.points[index - 1].lon);
      const x = longitude * Math.max(0.001, Math.cos(meanLat * Math.PI / 180));
      const y = -point.lat;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return { x, y, point };
    });
  });
  const scale = Math.min((width - 2 * padding) / Math.max(maxX - minX, 1e-10), (height - 2 * padding) / Math.max(maxY - minY, 1e-10));
  return projected.map(segment => segment.map(({ x, y, point }) => ({
    x: width / 2 + (x - (minX + maxX) / 2) * scale,
    y: height / 2 + (y - (minY + maxY) / 2) * scale, point,
  })));
}

export function safeCSV(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportCSV(track: Track, start = 0, end = track.points.length - 1): string {
  const header = ['point', 'segment', 'latitude_deg', 'longitude_deg', 'elevation_m', 'time_utc', 'cumulative_track_distance_m'];
  const rows = track.points.slice(start, end + 1).map(point => [point.index + 1, point.segment + 1,
    point.lat, point.lon, point.elevation, point.time === null ? null : new Date(point.time).toISOString(), point.distance].map(safeCSV).join(','));
  return [header.join(','), ...rows].join('\r\n');
}

export function exportJSON(track: Track, start = 0, end = track.points.length - 1): string {
  const points = track.points.slice(start, end + 1);
  return JSON.stringify({ schemaVersion: 1, name: track.name, units: { distance: 'm', elevation: 'm', elapsed: 'ms', coordinates: 'degrees' },
    selection: { firstPoint: start + 1, lastPoint: end + 1 },
    methods: { distance: 'Haversine, mean Earth radius 6371008.8 m; no segment-gap bridging',
      elevation: 'Raw adjacent elevation deltas; missing pairs excluded; no smoothing',
      elapsed: 'Sum of strictly increasing adjacent timestamps; missing or non-increasing pairs excluded',
      cumulativeDistance: 'Distance from the start of the original track; preserved for selections' },
    summary: measure(points), points: points.map(({ time, ...point }) => ({ ...point, time: time === null ? null : new Date(time).toISOString() })) }, null, 2);
}

/** Last-started import wins, including failures; previously displayed data stays intact. */
export class ImportSession {
  private generation = 0;
  cancel(): void { this.generation++; }
  async load(read: () => Promise<string>, name: string, commit: (track: Track) => void, fail: (error: Error) => void): Promise<void> {
    const generation = ++this.generation;
    try {
      const text = await read();
      if (generation !== this.generation) return;
      const track = parseGPX(text, name);
      if (generation === this.generation) commit(track);
    } catch (error) {
      if (generation === this.generation) fail(error instanceof Error ? error : new Error('Unable to read this file.'));
    }
  }
}
