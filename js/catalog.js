// Catalogo iniziale degli esercizi con illustrazioni originali a figura stilizzata.
// b: corpo, h: testa, g: attrezzi, d: dischi [x,y,r], m: manubri [x,y]
const LYING = '28,60 56,60 74,58 76,88';
const BENCH = ['18,66 78,66', '26,66 26,88', '70,66 70,88'];
const STAND = '48,90 48,70 48,50 48,24';
const SEAT = '66,86 66,62 46,62 44,36';
const SEAT_G = ['36,68 56,68', '48,68 48,88', '36,30 36,68'];

const POSES = {
  bench: { b: [LYING, '32,58 32,30'], h: [20, 58], g: BENCH, d: [[32, 30, 12]] },
  incline: { b: ['32,38 58,68 76,56 76,88', '32,38 34,12'], h: [26, 28], g: ['24,36 56,76', '56,76 56,90', '44,62 44,90'], m: [[34, 9]] },
  fly: { b: ['32,58 68,58', '32,58 18,48 8,42', '68,58 82,48 92,42'], h: [50, 48], g: ['34,70 66,70', '40,70 40,88', '60,70 60,88'], m: [[8, 39], [92, 39]] },
  chestpress: { b: [SEAT, '44,38 58,46 72,40'], h: [44, 25], g: [...SEAT_G, '72,28 72,52'] },
  pushup: { b: ['12,86 44,74 70,64', '70,64 70,88'], h: [80, 58], g: ['4,90 96,90'] },
  dip: { b: ['42,90 50,80 48,62 50,34', '50,34 38,42 50,48'], h: [53, 22], g: ['28,48 72,48', '32,48 32,90', '68,48 68,90'] },
  latpull: { b: ['50,36 50,64', '38,36 62,36', '38,36 24,30 26,14', '62,36 76,30 74,14', '38,88 38,68 50,64 62,68 62,88'], h: [50, 24], g: ['16,14 84,14', '50,14 50,2', '30,70 70,70'] },
  pullup: { b: ['50,32 50,62', '38,34 62,34', '38,34 26,22 30,8', '62,34 74,22 70,8', '44,94 44,78 50,62 56,78 56,94'], h: [50, 21], g: ['12,8 88,8'] },
  row: { b: ['50,90 56,70 40,54 66,40', '66,40 54,52 62,60'], h: [75, 34], d: [[62, 62, 11]], g: ['4,90 96,90'] },
  seatedrow: { b: ['76,84 58,62 38,76 34,48', '34,50 24,58 46,60'], h: [32, 37], g: ['46,60 92,76', '26,82 54,82', '76,88 92,70'] },
  deadlift: { b: ['52,90 62,74 40,58 64,44', '64,44 64,74'], h: [72, 36], d: [[64, 77, 13]] },
  rdl: { b: ['50,90 54,70 40,52 68,46', '68,46 68,70'], h: [77, 42], d: [[68, 73, 10]] },
  ohp: { b: ['50,26 50,50', '36,26 64,26', '36,26 30,14 30,4', '64,26 70,14 70,4', '42,90 42,70 50,50 58,70 58,90'], h: [50, 14], g: ['10,4 90,4'], d: [[12, 4, 4], [88, 4, 4]] },
  lateral: { b: ['50,28 50,52', '38,28 62,28', '38,28 14,28', '62,28 86,28', '42,90 42,70 50,52 58,70 58,90'], h: [50, 15], m: [[10, 28], [90, 28]] },
  curl: { b: [STAND, '48,26 48,42 62,30'], h: [48, 13], d: [[65, 28, 9]] },
  hammer: { b: [STAND, '48,26 48,42 62,30'], h: [48, 13], m: [[65, 27]] },
  pushdown: { b: ['46,90 46,70 46,50 50,24', '50,26 54,42 68,52'], h: [52, 13], g: ['72,6 68,52', '60,52 76,52'], d: [[72, 7, 4]] },
  skull: { b: [LYING, '34,58 30,34 18,42'], h: [20, 58], g: BENCH, d: [[15, 42, 8]] },
  squat: { b: ['58,90 66,72 44,64 56,40', '56,40 64,44 58,36'], h: [65, 28], d: [[54, 36, 12]] },
  legpress: { b: ['74,64 58,54 38,76 18,58'], h: [12, 47], g: ['14,66 40,84', '64,78 84,50', '40,84 40,90'] },
  lunge: { b: ['72,90 72,68 50,60 34,84 18,88', '50,60 50,34', '50,36 50,58'], h: [50, 23], m: [[50, 63]] },
  legext: { b: ['82,56 62,62 42,62 40,36'], h: [41, 25], g: [...SEAT_G.map((s) => s), '62,66 60,88'], d: [[86, 60, 5]] },
  legcurl: { b: ['72,34 74,54 54,54 26,54'], h: [16, 47], g: ['20,62 78,62', '28,62 28,88', '70,62 70,88'], d: [[68, 29, 5]] },
  hipthrust: { b: ['70,88 70,50 52,46 26,52'], h: [16, 45], g: ['8,60 32,60', '20,60 20,90'], d: [[52, 34, 11]] },
  calf: { b: ['46,76 46,58 46,42 46,20', '46,76 56,84', '46,22 46,44'], h: [46, 9], g: ['38,86 66,86'], m: [[46, 48]] },
  crunch: { b: ['76,86 62,64 44,84 26,68', '26,68 34,58'], h: [20, 58], g: ['8,90 92,90'] },
  plank: { b: ['12,84 44,74 70,68', '70,68 70,86 86,86'], h: [81, 63], g: ['4,90 96,90'] },
  legraise: { b: ['40,32 42,60 84,60', '40,32 38,8'], h: [50, 23], g: ['24,8 56,8'] },
  generic: { b: [], g: ['28,50 72,50'], d: [[24, 50, 12], [76, 50, 12], [14, 50, 8], [86, 50, 8]] },
};

export function figure(pose) {
  const p = POSES[pose] || POSES.generic;
  const lines = (arr, cls) => (arr || []).map((s) => `<polyline class="${cls}" points="${s}"/>`).join('');
  const discs = (p.d || []).map(([x, y, r]) => `<circle class="fd" cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const bells = (p.m || []).map(([x, y]) => `<path class="fm" d="M${x - 7} ${y}H${x + 7}M${x - 7} ${y - 5}V${y + 5}M${x + 7} ${y - 5}V${y + 5}"/>`).join('');
  const head = p.h ? `<circle class="fh" cx="${p.h[0]}" cy="${p.h[1]}" r="7"/>` : '';
  return `<svg class="fig" viewBox="0 0 100 100" aria-hidden="true">${lines(p.g, 'fg')}${lines(p.b, 'fb')}${head}${discs}${bells}</svg>`;
}

export const MUSCLES = ['Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Glutei', 'Polpacci', 'Addome', 'Altro'];

// bw: quota del peso corporeo che conta come carico (1 = tutto il corpo).
const row = (id, name, muscle, pose, bw = 0) => ({ id: `c-${id}`, name, muscle, pose, bw, builtin: true });

export const CATALOG = [
  row('panca-piana', 'Panca piana con bilanciere', 'Petto', 'bench'),
  row('panca-inclinata', 'Panca inclinata con manubri', 'Petto', 'incline'),
  row('croci', 'Croci con manubri', 'Petto', 'fly'),
  row('chest-press', 'Chest press', 'Petto', 'chestpress'),
  row('piegamenti', 'Piegamenti', 'Petto', 'pushup', 0.65),
  row('dip', 'Dip alle parallele', 'Petto', 'dip', 1),
  row('lat-machine', 'Lat machine', 'Schiena', 'latpull'),
  row('trazioni', 'Trazioni alla sbarra', 'Schiena', 'pullup', 1),
  row('rematore', 'Rematore con bilanciere', 'Schiena', 'row'),
  row('pulley', 'Pulley basso', 'Schiena', 'seatedrow'),
  row('stacco', 'Stacco da terra', 'Schiena', 'deadlift'),
  row('lento-avanti', 'Lento avanti', 'Spalle', 'ohp'),
  row('alzate-laterali', 'Alzate laterali', 'Spalle', 'lateral'),
  row('curl-bilanciere', 'Curl con bilanciere', 'Bicipiti', 'curl'),
  row('curl-martello', 'Curl a martello', 'Bicipiti', 'hammer'),
  row('pushdown', 'Pushdown ai cavi', 'Tricipiti', 'pushdown'),
  row('french-press', 'French press', 'Tricipiti', 'skull'),
  row('squat', 'Squat', 'Gambe', 'squat'),
  row('leg-press', 'Leg press', 'Gambe', 'legpress'),
  row('affondi', 'Affondi con manubri', 'Gambe', 'lunge'),
  row('leg-extension', 'Leg extension', 'Gambe', 'legext'),
  row('leg-curl', 'Leg curl', 'Gambe', 'legcurl'),
  row('stacco-rumeno', 'Stacco rumeno', 'Glutei', 'rdl'),
  row('hip-thrust', 'Hip thrust', 'Glutei', 'hipthrust'),
  row('calf', 'Calf raise in piedi', 'Polpacci', 'calf'),
  row('crunch', 'Crunch', 'Addome', 'crunch'),
  row('plank', 'Plank', 'Addome', 'plank'),
  row('leg-raise', 'Sollevamento gambe alla sbarra', 'Addome', 'legraise'),
];
