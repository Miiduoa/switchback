/** A deterministic invented trail for demonstrating the viewer, not a real route. */
export function demoGPX(): string {
  const controls = [
    [0, 0, 420], [.12, .12, 438], [.05, .30, 458], [.22, .42, 478], [.10, .55, 501],
    [.38, .65, 524], [.18, .77, 554], [.55, .87, 586], [.36, .98, 614], [.68, 1.08, 652],
    [.55, 1.20, 694], [.86, 1.32, 721], [1.09, 1.22, 706], [1.32, 1.35, 743],
    [1.51, 1.23, 758], [1.45, 1.06, 741], [1.57, .91, 710], [1.39, .77, 667],
    [1.46, .56, 626], [1.19, .38, 586], [1.00, .46, 570], [.80, .22, 528],
    [.59, .31, 496], [.41, .10, 459], [.19, .07, 438], [0, 0, 420],
  ];
  const points: string[] = [];
  const start = Date.UTC(2026, 3, 12, 7, 30);
  for (let i = 0; i < controls.length - 1; i++) {
    for (let j = 0; j < 16; j++) {
      const t = j / 16, a = controls[i], b = controls[i + 1];
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const ele = a[2] + (b[2] - a[2]) * t + Math.sin(t * Math.PI * 2) * 0.6;
      const index = points.length;
      points.push(`<trkpt lat="${(24 + y * .018).toFixed(7)}" lon="${(121 + x * .018).toFixed(7)}"><ele>${ele.toFixed(1)}</ele><time>${new Date(start + index * 25_000).toISOString()}</time></trkpt>`);
    }
  }
  points.push(`<trkpt lat="24" lon="121"><ele>420</ele><time>${new Date(start + points.length * 25_000).toISOString()}</time></trkpt>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Switchback synthetic demo" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Switchback study</name><desc>Synthetic demonstration data. Not a real trail or a navigation route.</desc></metadata><trk><name>Switchback study</name><trkseg>${points.join('\n')}</trkseg></trk></gpx>`;
}
