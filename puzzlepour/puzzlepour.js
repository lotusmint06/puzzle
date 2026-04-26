const CAPACITY = 4;

const PALETTE = [
  { color: '#ff6b6b', dark: '#c43c3c', light: '#ff9f9f' },
  { color: '#4d96ff', dark: '#2060c0', light: '#85bbff' },
  { color: '#ffd93d', dark: '#c4a000', light: '#ffe980' },
  { color: '#6bcb77', dark: '#3a9a45', light: '#9de0a6' },
  { color: '#a78bfa', dark: '#7c5cda', light: '#c4b0fd' },
  { color: '#ff9f43', dark: '#c47820', light: '#ffc27a' },
  { color: '#00d2d3', dark: '#009a9b', light: '#60e8e9' },
  { color: '#ee5a24', dark: '#b84010', light: '#f58a60' },
  { color: '#fd79a8', dark: '#c0496e', light: '#feb8d0' },
  { color: '#00b894', dark: '#007a60', light: '#55d4b8' },
];

const LEVELS = {
  easy:   { colors: 4,  extras: 2, cols: 6 },
  medium: { colors: 6,  extras: 2, cols: 4 },
  hard:   { colors: 10, extras: 2, cols: 4 },
};

let tubes, selected, moves, gameState, difficulty;
let canvas, ctx, dpr, layout = [];

// --- Init ---
function init(diff) {
  if (diff) difficulty = diff;
  difficulty = difficulty || 'easy';

  document.querySelectorAll('.diff-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.diff === difficulty));

  selected  = null;
  moves     = 0;
  gameState = 'playing';
  document.getElementById('movesDisplay').textContent = 0;
  document.getElementById('overlay').classList.remove('show');

  const { colors, extras } = LEVELS[difficulty];
  tubes = generatePuzzle(colors, extras);
  resizeCanvas();
}

// --- Canvas ---
function initCanvas() {
  canvas = document.getElementById('tubeCanvas');
  ctx    = canvas.getContext('2d');
  dpr    = Math.min(window.devicePixelRatio || 1, 2);

  canvas.addEventListener('click', e => {
    const { x, y } = canvasPos(e.clientX, e.clientY);
    const idx = hitTest(x, y);
    if (idx >= 0) selectTube(idx);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const { x, y } = canvasPos(t.clientX, t.clientY);
    const idx = hitTest(x, y);
    if (idx >= 0) selectTube(idx);
  }, { passive: false });

  window.addEventListener('resize', resizeCanvas);
}

function canvasPos(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (cx - rect.left) * (canvas.width  / rect.width),
    y: (cy - rect.top)  * (canvas.height / rect.height),
  };
}

function resizeCanvas() {
  const wrap = document.getElementById('boardOuter');
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  computeLayout();
  drawGame();
}

function computeLayout() {
  if (!tubes) return;
  const { cols } = LEVELS[difficulty];
  const rows = Math.ceil(tubes.length / cols);
  const W = canvas.width, H = canvas.height;
  const pad  = 18 * dpr;
  const gapX = 8  * dpr;
  const gapY = 12 * dpr;

  const cellW = (W - pad*2 - gapX*(cols-1)) / cols;
  const cellH = (H - pad*2 - gapY*(rows-1)) / rows;

  // Tube proportions: tube width = 55% of cell, height = 90% of cell
  const tw = cellW * 0.55;
  const th = cellH * 0.88;

  layout = tubes.map((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx  = pad + col * (cellW + gapX) + cellW / 2;
    const cy  = pad + row * (cellH + gapY) + cellH / 2;
    return { cx, cy, tw, th, col, row };
  });
}

function hitTest(x, y) {
  for (let i = layout.length - 1; i >= 0; i--) {
    const { cx, cy, tw, th } = layout[i];
    const x0 = cx - tw/2, x1 = cx + tw/2;
    const y0 = cy - th/2, y1 = cy + th/2;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return i;
  }
  return -1;
}

// --- Draw ---
function drawGame() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tubes.forEach((tube, i) => drawTube(i, tube));
}

function drawTube(idx, tube) {
  const { cx, cy, tw, th } = layout[idx];
  const isSel = selected === idx;
  const lift  = isSel ? 10 * dpr : 0;
  const x = cx - tw/2;
  const y = cy - th/2 - lift;
  const r = tw / 2; // bottom semicircle radius

  ctx.save();

  // Drop shadow
  ctx.shadowColor = isSel ? 'rgba(77,150,255,0.45)' : 'rgba(0,0,0,0.18)';
  ctx.shadowBlur  = isSel ? 18 * dpr : 10 * dpr;
  ctx.shadowOffsetY = 4 * dpr;

  // Tube path: straight walls + perfect semicircle bottom
  const tubePath = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tw, y);
    ctx.lineTo(x + tw, y + th - r);
    ctx.arc(x + tw/2, y + th - r, r, 0, Math.PI); // semicircle bottom
    ctx.lineTo(x, y);
    ctx.closePath();
  };

  // Background (empty glass)
  tubePath();
  ctx.fillStyle = 'rgba(230,215,195,0.3)';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Color segments — fill from bottom to top within the straight portion
  const usableH = th - r;   // straight part height
  const segH    = usableH / CAPACITY;
  ctx.save();
  tubePath();
  ctx.clip();

  for (let s = 0; s < tube.length; s++) {
    const p    = PALETTE[tube[s]];
    const sy   = y + usableH - (s + 1) * segH;

    // Main color gradient
    const grad = ctx.createLinearGradient(x, sy, x + tw, sy + segH);
    grad.addColorStop(0,   p.light);
    grad.addColorStop(0.35, p.color);
    grad.addColorStop(1,   p.dark);

    ctx.fillStyle = grad;
    // 맨 아래 세그먼트는 반원까지 연장
    const drawH = s === 0 ? segH + r : segH + 1;
    ctx.fillRect(x, sy, tw, drawH);

    // Top edge highlight line
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, sy, tw, 2 * dpr);

    // Separator line between segments
    if (s < tube.length - 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, sy + segH - dpr, tw, dpr);
    }
  }
  ctx.restore();

  // Glass shine (left highlight)
  tubePath();
  ctx.clip();
  const shine = ctx.createLinearGradient(x, y, x + tw, y);
  shine.addColorStop(0,    'rgba(255,255,255,0.28)');
  shine.addColorStop(0.18, 'rgba(255,255,255,0.10)');
  shine.addColorStop(0.5,  'rgba(255,255,255,0)');
  shine.addColorStop(1,    'rgba(0,0,0,0.06)');
  ctx.fillStyle = shine;
  ctx.fill();

  // Top shine strip
  const stripW = tw * 0.28;
  const strip  = ctx.createLinearGradient(x + tw*0.08, y, x + tw*0.08, y + th*0.45);
  strip.addColorStop(0,   'rgba(255,255,255,0.45)');
  strip.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = strip;
  ctx.fillRect(x + tw*0.08, y, stripW, th * 0.45);

  ctx.restore();
  ctx.save();

  // Tube border
  tubePath();
  ctx.strokeStyle = isSel
    ? 'rgba(77,150,255,0.8)'
    : 'rgba(180,150,110,0.6)';
  ctx.lineWidth = isSel ? 2.5 * dpr : 1.8 * dpr;
  ctx.stroke();

  // Selected glow ring
  if (isSel) {
    tubePath();
    ctx.strokeStyle = 'rgba(77,150,255,0.3)';
    ctx.lineWidth   = 5 * dpr;
    ctx.stroke();
  }

  // Rim cap at top
  ctx.beginPath();
  ctx.moveTo(x - 3*dpr, y);
  ctx.lineTo(x + tw + 3*dpr, y);
  ctx.strokeStyle = isSel ? 'rgba(77,150,255,0.7)' : 'rgba(180,150,110,0.5)';
  ctx.lineWidth   = 3 * dpr;
  ctx.lineCap     = 'round';
  ctx.stroke();

  ctx.restore();
}

// --- Game Logic ---
function selectTube(idx) {
  if (gameState !== 'playing') return;

  if (selected === null) {
    if (!tubes[idx].length || isTubeComplete(tubes[idx])) return;
    selected = idx;
    drawGame();
    return;
  }
  if (selected === idx) { selected = null; drawGame(); return; }

  if (canMove(tubes, selected, idx)) {
    applyMove(tubes, selected, idx);
    moves++;
    document.getElementById('movesDisplay').textContent = moves;
    selected = null;
    drawGame();
    if (isSolved(tubes)) { gameState = 'won'; setTimeout(showWin, 350); }
  } else {
    // Shake: brief wrong-tube visual
    const prev = selected;
    selected = null;
    drawGame();
    setTimeout(() => {
      if (!tubes[idx].length || isTubeComplete(tubes[idx])) return;
      selected = prev;
      drawGame();
    }, 80);
  }
}

function showWin() {
  document.getElementById('overlaySub').textContent = `${moves}번 만에 클리어!`;
  document.getElementById('overlay').classList.add('show');
}

function isTubeComplete(tube) {
  return tube.length === CAPACITY && tube.every(c => c === tube[0]);
}
function isSolved(t) {
  return t.every(tube => tube.length === 0 || isTubeComplete(tube));
}
function canMove(t, from, to, ignoreComplete = false) {
  if (!t[from].length) return false;
  if (t[to].length >= CAPACITY) return false;
  if (!ignoreComplete && isTubeComplete(t[from])) return false;
  const top = t[from][t[from].length - 1];
  if (!t[to].length) return true;
  return t[to][t[to].length - 1] === top;
}
function applyMove(t, from, to) {
  const top   = t[from][t[from].length - 1];
  const space = CAPACITY - t[to].length;
  let count   = 0;
  for (let i = t[from].length - 1; i >= 0 && t[from][i] === top; i--) count++;
  const n = Math.min(count, space);
  for (let i = 0; i < n; i++) t[to].push(t[from].pop());
}

// --- Puzzle Generation ---
function generatePuzzle(numColors, extras) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pool = [];
    for (let c = 0; c < numColors; c++)
      for (let k = 0; k < CAPACITY; k++) pool.push(c);
    shuffleArr(pool);
    const t = [];
    for (let i = 0; i < numColors; i++)
      t.push(pool.slice(i * CAPACITY, (i + 1) * CAPACITY));
    for (let i = 0; i < extras; i++) t.push([]);
    if (!isSolved(t)) return t;
  }
  const t = [];
  for (let i = 0; i < numColors; i++) t.push(Array(CAPACITY).fill(i));
  [t[0][0], t[1][0]] = [t[1][0], t[0][0]];
  for (let i = 0; i < extras; i++) t.push([]);
  return t;
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

window.addEventListener('load', () => {
  initCanvas();
  init('easy');
});
