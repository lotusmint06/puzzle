const CAPACITY = 4;

const PALETTE = [
  { color: '#ff6b6b', shadow: '#c43c3c' },
  { color: '#4d96ff', shadow: '#2060c0' },
  { color: '#ffd93d', shadow: '#c4a000' },
  { color: '#6bcb77', shadow: '#3a9a45' },
  { color: '#a78bfa', shadow: '#7c5cda' },
  { color: '#ff9f43', shadow: '#c47820' },
  { color: '#00d2d3', shadow: '#009a9b' },
  { color: '#ee5a24', shadow: '#b84010' },
  { color: '#fd79a8', shadow: '#c0496e' },
  { color: '#00b894', shadow: '#007a60' },
];

// cols: 한 줄에 튜브 몇 개
const LEVELS = {
  easy:   { colors: 4,  extras: 2, cols: 6 },
  medium: { colors: 6,  extras: 2, cols: 4 },
  hard:   { colors: 10, extras: 2, cols: 4 },
};

let tubes, selected, moves, gameState, difficulty;

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
  renderTubes();
}

// --- Puzzle Generation ---
function generatePuzzle(numColors, extras) {
  // 색 조각을 무작위로 섞어서 튜브에 배분
  for (let attempt = 0; attempt < 50; attempt++) {
    const pool = [];
    for (let c = 0; c < numColors; c++)
      for (let k = 0; k < CAPACITY; k++)
        pool.push(c);
    shuffleArr(pool);

    const t = [];
    for (let i = 0; i < numColors; i++)
      t.push(pool.slice(i * CAPACITY, (i + 1) * CAPACITY));
    for (let i = 0; i < extras; i++) t.push([]);

    if (!isSolved(t)) return t;
  }
  // 폴백: 강제로 2색만 섞어서 반환
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

function getValidMoves(t, allowComplete = false) {
  const moves = [];
  for (let f = 0; f < t.length; f++) {
    if (!t[f].length) continue;
    if (!allowComplete && isTubeComplete(t[f])) continue;
    for (let to = 0; to < t.length; to++) {
      if (f === to) continue;
      if (canMove(t, f, to, allowComplete)) moves.push([f, to]);
    }
  }
  return moves;
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

function isTubeComplete(tube) {
  return tube.length === CAPACITY && tube.every(c => c === tube[0]);
}

function isSolved(t) {
  return t.every(tube => tube.length === 0 || isTubeComplete(tube));
}

// --- Interaction ---
function selectTube(idx) {
  if (gameState !== 'playing') return;

  if (selected === null) {
    if (!tubes[idx].length) return;
    if (isTubeComplete(tubes[idx])) return;
    selected = idx;
    renderTubes();
    return;
  }

  if (selected === idx) {
    selected = null;
    renderTubes();
    return;
  }

  if (canMove(tubes, selected, idx)) {
    applyMove(tubes, selected, idx);
    moves++;
    document.getElementById('movesDisplay').textContent = moves;
    selected = null;
    renderTubes();
    if (isSolved(tubes)) {
      gameState = 'won';
      setTimeout(showWin, 400);
    }
  } else {
    // Invalid: shake and reselect
    shakeTube(idx);
    selected = idx.length === 0 || isTubeComplete(tubes[idx]) ? null : idx;
    if (!tubes[idx].length || isTubeComplete(tubes[idx])) selected = null;
    renderTubes();
  }
}

function shakeTube(idx) {
  const el = document.querySelector(`.tube-wrap[data-idx="${idx}"]`);
  if (!el) return;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

function showWin() {
  document.getElementById('overlaySub').textContent = `${moves}번 만에 클리어!`;
  document.getElementById('overlay').classList.add('show');
}

// --- Render ---
function renderTubes() {
  const container = document.getElementById('tubeContainer');
  container.innerHTML = '';
  const cols = LEVELS[difficulty].cols;
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.display = 'grid';

  tubes.forEach((tube, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'tube-wrap' + (selected === idx ? ' sel' : '');
    wrap.dataset.idx = idx;
    wrap.addEventListener('click', () => selectTube(idx));

    // Top cap (open)
    const cap = document.createElement('div');
    cap.className = 'tube-cap';
    wrap.appendChild(cap);

    // Glass body
    const glass = document.createElement('div');
    glass.className = 'tube-glass';

    // Render segments: top to bottom (CAPACITY slots)
    const empties = CAPACITY - tube.length;
    for (let i = 0; i < empties; i++) {
      const seg = document.createElement('div');
      seg.className = 'segment empty';
      glass.appendChild(seg);
    }

    for (let i = tube.length - 1; i >= 0; i--) {
      const seg = document.createElement('div');
      const p   = PALETTE[tube[i]];
      seg.className = 'segment';
      seg.style.background  = p.color;
      seg.style.boxShadow   = `inset 0 -3px 0 ${p.shadow}, inset 0 3px 6px rgba(255,255,255,0.3)`;

      // Lift top segments of selected tube
      const isTop   = i === tube.length - 1;
      const topColor = tube[tube.length - 1];
      let liftCount = 0;
      for (let j = tube.length - 1; j >= 0 && tube[j] === topColor; j--) liftCount++;
      const isLifted = selected === idx && i >= tube.length - liftCount;
      if (isLifted) seg.classList.add('lifted');

      glass.appendChild(seg);
    }

    wrap.appendChild(glass);
    container.appendChild(wrap);
  });
}
