// Fit linear projection SVG coords from lat/lng using known city anchors
const anchors = [
  { name: 'bogota', lat: 4.711, lng: -74.072, cx: 300, cy: 360 },
  { name: 'medellin', lat: 6.244, lng: -75.581, cx: 255, cy: 295 },
  { name: 'barranquilla', lat: 10.968, lng: -74.781, cx: 275, cy: 85 },
  { name: 'cali', lat: 3.452, lng: -76.532, cx: 225, cy: 395 },
  { name: 'bucaramanga', lat: 7.119, lng: -73.123, cx: 330, cy: 235 },
  { name: 'monteria', lat: 8.748, lng: -75.882, cx: 255, cy: 165 },
  { name: 'cucuta', lat: 7.894, lng: -72.508, cx: 395, cy: 225 },
  { name: 'pasto', lat: 1.213, lng: -77.281, cx: 205, cy: 470 },
  { name: 'villavicencio', lat: 4.142, lng: -73.627, cx: 360, cy: 355 },
  { name: 'cartagena', lat: 10.391, lng: -75.479, cx: 250, cy: 95 },
];

function fit(xs, ys) {
  const n = xs.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const b = (sy - a * sx) / n;
  return { a, b };
}

const lngs = anchors.map((a) => a.lng);
const cxs = anchors.map((a) => a.cx);
const lats = anchors.map((a) => a.lat);
const cys = anchors.map((a) => a.cy);
const xFit = fit(lngs, cxs);
const yFit = fit(lats, cys);
console.log('cx = a*lng + b', xFit);
console.log('cy = c*lat + d', yFit);

for (const a of anchors) {
  const px = xFit.a * a.lng + xFit.b;
  const py = yFit.a * a.lat + yFit.b;
  console.log(
    a.name,
    'err',
    Math.hypot(px - a.cx, py - a.cy).toFixed(1),
    '=>',
    px.toFixed(1),
    py.toFixed(1)
  );
}
