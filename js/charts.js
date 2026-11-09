// Grafici SVG a una sola serie, senza librerie esterne: restano disponibili offline.
const HEIGHT = 190;
const M = { l: 46, r: 16, t: 22, b: 26 };

function niceTicks(min, max, count = 4) {
  if (min === max) { max = min + 1; min = Math.max(0, min - 1); }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = lo; v < max + step * 0.999; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

const compact = (v) => (v >= 10000 ? `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k` : v.toLocaleString('it-IT', { maximumFractionDigits: 1 }));

function frame(el, ticks, sy, W) {
  const grid = ticks.map((t) => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${sy(t)}" y2="${sy(t)}"/><text class="ax" x="${M.l - 8}" y="${sy(t) + 4}" text-anchor="end">${compact(t)}</text>`).join('');
  el.classList.add('chart');
  return grid;
}

function tooltip(el) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  el.append(tip);
  return {
    show(x, y, html) {
      tip.innerHTML = html;
      tip.hidden = false;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(el.clientWidth - w, x - w / 2))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 12)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

export function lineChart(el, { points, format, xLabel }) {
  const W = el.clientWidth || 320;
  const ys = points.map((p) => p.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const sy = (v) => M.t + (HEIGHT - M.t - M.b) * (1 - (v - y0) / (y1 - y0));
  const x0 = points[0].x, x1 = points[points.length - 1].x;
  const sx = (v) => (x1 === x0 ? (M.l + W - M.r) / 2 : M.l + (W - M.l - M.r) * ((v - x0) / (x1 - x0)));
  const coords = points.map((p) => ({ ...p, cx: sx(p.x), cy: sy(p.y) }));
  const last = coords[coords.length - 1];
  const labelX = Math.max(M.l + 20, Math.min(W - M.r - 20, last.cx));
  const axis = [`<text class="ax" x="${coords[0].cx}" y="${HEIGHT - 6}" text-anchor="${coords.length > 1 ? 'start' : 'middle'}">${xLabel(points[0])}</text>`];
  if (coords.length > 1) axis.push(`<text class="ax" x="${last.cx}" y="${HEIGHT - 6}" text-anchor="end">${xLabel(points[points.length - 1])}</text>`);

  el.innerHTML = `<svg width="${W}" height="${HEIGHT}" role="img" aria-label="Andamento nel tempo">
    ${frame(el, ticks, sy, W)}${axis.join('')}
    <polyline class="line" points="${coords.map((c) => `${c.cx},${c.cy}`).join(' ')}"/>
    <line class="cross" y1="${M.t}" y2="${HEIGHT - M.b}" visibility="hidden"/>
    ${coords.map((c) => `<circle class="dot" cx="${c.cx}" cy="${c.cy}" r="4"/>`).join('')}
    <text class="val" x="${labelX}" y="${Math.max(12, last.cy - 11)}" text-anchor="middle">${format(last.y)}</text>
  </svg>`;

  const svg = el.querySelector('svg');
  const cross = el.querySelector('.cross');
  const tip = tooltip(el);
  svg.onpointermove = svg.onpointerdown = (e) => {
    const x = e.clientX - svg.getBoundingClientRect().left;
    const c = coords.reduce((a, b) => (Math.abs(b.cx - x) < Math.abs(a.cx - x) ? b : a));
    cross.setAttribute('x1', c.cx);
    cross.setAttribute('x2', c.cx);
    cross.setAttribute('visibility', 'visible');
    tip.show(c.cx, c.cy, `<b>${format(c.y)}</b><span>${c.label}</span>`);
  };
  svg.onpointerleave = () => { cross.setAttribute('visibility', 'hidden'); tip.hide(); };
}

export function barChart(el, { bars, format }) {
  const W = el.clientWidth || 320;
  const max = Math.max(...bars.map((b) => b.y), 1);
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1];
  const base = HEIGHT - M.b;
  const sy = (v) => M.t + (base - M.t) * (1 - v / top);
  const band = (W - M.l - M.r) / bars.length;
  const bw = Math.min(18, Math.max(4, band - 2));
  const every = Math.ceil(bars.length / 5);

  const marks = bars.map((b, i) => {
    const x = M.l + band * i + (band - bw) / 2;
    const y = sy(b.y);
    const r = Math.min(4, bw / 2, base - y);
    const mark = b.y > 0 ? `<path class="bar" d="M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${base}Z"/>` : '';
    const label = (bars.length - 1 - i) % every === 0 ? `<text class="ax" x="${x + bw / 2}" y="${HEIGHT - 6}" text-anchor="middle">${b.short}</text>` : '';
    return `<g data-i="${i}">${mark}${label}<rect class="hit" x="${M.l + band * i}" y="${M.t}" width="${band}" height="${base - M.t}"/></g>`;
  }).join('');

  el.innerHTML = `<svg width="${W}" height="${HEIGHT}" role="img" aria-label="Grafico a barre">
    ${frame(el, ticks, sy, W)}${marks}<line class="base" x1="${M.l}" x2="${W - M.r}" y1="${base}" y2="${base}"/></svg>`;

  const svg = el.querySelector('svg');
  const tip = tooltip(el);
  let hot = null;
  const clear = () => { hot?.classList.remove('hot'); hot = null; };
  svg.onpointermove = svg.onpointerdown = (e) => {
    const g = e.target.closest('g[data-i]');
    if (!g) { clear(); tip.hide(); return; }
    clear();
    hot = g;
    g.classList.add('hot');
    const i = Number(g.dataset.i);
    tip.show(M.l + band * (i + 0.5), sy(bars[i].y), `<b>${format(bars[i].y)}</b><span>${bars[i].label}</span>`);
  };
  svg.onpointerleave = () => { clear(); tip.hide(); };
}

// Barre orizzontali con il valore sempre scritto accanto.
export function hbars(rows, unit) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return `<div class="hbars">${rows.map(([name, v]) => `
    <div class="hbar"><span class="hname">${name}</span><span class="htrack"><i style="width:${(v / max) * 100}%"></i></span><span class="hval">${v} ${unit}</span></div>`).join('')}</div>`;
}
