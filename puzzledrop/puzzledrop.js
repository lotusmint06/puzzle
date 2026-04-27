const ROWS = 8, COLS = 8;

const COLORS = ['#ff6b6b','#ff9f43','#ffd93d','#6bcb77','#4d96ff','#a78bfa','#ee5a24'];
const SHADOWS = ['#c43c3c','#c47820','#c4a000','#3a9a45','#2060c0','#7c5cda','#b84010'];

const PIECE_DEFS = [
  [[0,0]],
  [[0,0],[0,1]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
  [[0,0],[1,0]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0],[2,1]],
  [[0,1],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[1,0],[2,0]],
  [[0,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[1,1]],
  [[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,0]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,1],[1,0],[1,1],[2,1]],
  [[0,1],[1,0],[1,1],[1,2]],
  [[0,0],[1,0],[1,1],[2,0]],
  [[0,0],[0,1],[1,1],[1,2]],
  [[0,1],[0,2],[1,0],[1,1]],
  [[0,0],[1,0],[1,1],[2,1]],
  [[0,1],[1,0],[1,1],[2,0]],
];

let grid, score, best, pieces, gameState;
let cellSize, boardRect;
let drag = null; // { idx, shape, color, colorIdx, el, previewR, previewC }

function init() {
  grid      = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  score     = 0;
  gameState = 'playing';
  best      = parseInt(localStorage.getItem('pd_best') || '0');
  pieces    = [null, null, null];

  document.getElementById('overlay').classList.remove('show');
  updateScore();
  computeMetrics();
  renderGrid();
  refillPieces();
}

function computeMetrics() {
  const boardEl = document.getElementById('pdGrid');
  boardRect  = boardEl.getBoundingClientRect();
  cellSize   = boardRect.width / COLS;
}

function randomPiece() {
  const shape    = PIECE_DEFS[Math.floor(Math.random() * PIECE_DEFS.length)];
  const colorIdx = Math.floor(Math.random() * COLORS.length);
  return { shape, color: COLORS[colorIdx], shadow: SHADOWS[colorIdx] };
}

function refillPieces() {
  let anyNull = pieces.some(p => p === null);
  if (!anyNull) return;
  // Refill all 3 at once when all are used
  if (pieces.every(p => p === null)) {
    pieces = [randomPiece(), randomPiece(), randomPiece()];
  } else {
    pieces = pieces.map(p => p === null ? randomPiece() : p);
  }
  renderPieces();
  checkGameOver();
}

function canPlace(shape, baseR, baseC) {
  return shape.every(([dr, dc]) => {
    const r = baseR + dr, c = baseC + dc;
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && !grid[r][c];
  });
}

function canPlaceAnywhere(shape) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (canPlace(shape, r, c)) return true;
  return false;
}

function placePiece(idx, baseR, baseC) {
  const { shape, color, shadow } = pieces[idx];
  shape.forEach(([dr, dc]) => {
    grid[baseR + dr][baseC + dc] = { color, shadow };
  });
  score += shape.length;
  pieces[idx] = null;
  renderGrid();

  const rows = [], cols = [];
  for (let r = 0; r < ROWS; r++)
    if (grid[r].every(c => c)) rows.push(r);
  for (let c = 0; c < COLS; c++)
    if (grid.every(row => row[c])) cols.push(c);

  if (!rows.length && !cols.length) {
    updateScore();
    if (pieces.every(p => p === null)) refillPieces();
    else { renderPieces(); checkGameOver(); }
    return;
  }

  // Flash cleared cells
  flashLines(rows, cols, () => {
    const cleared = rows.length + cols.length;
    const cells   = rows.length * COLS + cols.length * ROWS - rows.length * cols.length;
    const gained  = cells * 10 * cleared;
    score += gained;
    updateScore();

    rows.forEach(r => grid[r].fill(null));
    cols.forEach(c => grid.forEach(row => { row[c] = null; }));
    renderGrid();

    spawnClearPopup(rows, cols, gained, cleared);
    if (cleared >= 2) spawnComboText(cleared);

    if (pieces.every(p => p === null)) refillPieces();
    else { renderPieces(); checkGameOver(); }
  });
}

function flashLines(rows, cols, callback) {
  const cells = document.querySelectorAll('.pd-cell');
  const toFlash = new Set();
  rows.forEach(r => { for (let c = 0; c < COLS; c++) toFlash.add(r * COLS + c); });
  cols.forEach(c => { for (let r = 0; r < ROWS; r++) toFlash.add(r * COLS + c); });

  toFlash.forEach(i => cells[i]?.classList.add('clearing'));
  setTimeout(() => {
    toFlash.forEach(i => cells[i]?.classList.remove('clearing'));
    callback();
  }, 320);
}

function spawnClearPopup(rows, cols, pts, combo) {
  const boardEl = document.getElementById('bbGrid');
  if (!boardEl) return;
  const rect = boardEl.getBoundingClientRect();
  const cs   = rect.width / COLS;

  const centerR = rows.length ? rows[Math.floor(rows.length / 2)] : Math.floor(ROWS / 2);
  const centerC = cols.length ? cols[Math.floor(cols.length / 2)] : Math.floor(COLS / 2);

  const el = document.createElement('div');
  el.className = 'clear-popup';
  el.textContent = '+' + pts;
  el.style.left = (rect.left + centerC * cs + cs / 2) + 'px';
  el.style.top  = (rect.top  + centerR * cs + cs / 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function spawnComboText(count) {
  const boardEl = document.getElementById('bbGrid');
  if (!boardEl) return;
  const rect = boardEl.getBoundingClientRect();
  const labels = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'PENTA!'];
  const el = document.createElement('div');
  el.className = 'combo-popup';
  el.textContent = labels[Math.min(count, labels.length - 1)] || count + 'X COMBO!';
  el.style.left  = (rect.left + rect.width / 2) + 'px';
  el.style.top   = (rect.top  + rect.height / 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function checkGameOver() {
  const alive = pieces.some(p => p && canPlaceAnywhere(p.shape));
  if (!alive) {
    gameState = 'over';
    if (score > best) { best = score; localStorage.setItem('pd_best', best); }
    setTimeout(() => showOverlay(), 400);
  }
}

function updateScore() {
  document.getElementById('scoreDisplay').textContent = score;
  if (score > best) { best = score; localStorage.setItem('pd_best', best); }
  document.getElementById('bestDisplay').textContent = best;
}

function showOverlay() {
  document.getElementById('finalScore').textContent = `점수: ${score}`;
  document.getElementById('overlay').classList.add('show');
}

// --- Render ---
function renderGrid(previewR = -1, previewC = -1, previewShape = null, previewValid = false) {
  const gridEl = document.getElementById('pdGrid');
  const cells  = gridEl.querySelectorAll('.pd-cell');

  // Clear preview
  cells.forEach(c => { c.classList.remove('preview-ok','preview-bad'); c.style.background = ''; c.style.boxShadow = ''; });

  // Fill from grid state
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r * COLS + c];
      const v    = grid[r][c];
      if (v) {
        cell.style.background  = v.color;
        cell.style.boxShadow   = `0 3px 0 ${v.shadow}`;
      }
    }
  }

  // Draw preview
  if (previewShape && previewR >= 0) {
    previewShape.forEach(([dr, dc]) => {
      const r = previewR + dr, c = previewC + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      const cell = cells[r * COLS + c];
      cell.classList.add(previewValid ? 'preview-ok' : 'preview-bad');
    });
  }
}

function renderPieces() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`piece-${i}`);
    slot.innerHTML = '';
    const p = pieces[i];
    if (!p) { slot.style.visibility = 'hidden'; continue; }
    slot.style.visibility = drag && drag.idx === i ? 'hidden' : 'visible';

    const maxR = Math.max(...p.shape.map(([r]) => r));
    const maxC = Math.max(...p.shape.map(([,c]) => c));
    const dim  = Math.max(maxR + 1, maxC + 1);
    const cs   = Math.min(Math.floor(80 / dim), 22);

    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:${(maxC+1)*cs}px;height:${(maxR+1)*cs}px;`;

    p.shape.forEach(([r, c]) => {
      const cell = document.createElement('div');
      cell.style.cssText = `
        position:absolute;
        left:${c*cs}px; top:${r*cs}px;
        width:${cs-2}px; height:${cs-2}px;
        background:${p.color}; border-radius:${Math.max(2,cs*0.2)}px;
        box-shadow:0 ${Math.max(2,cs*0.12)}px 0 ${p.shadow};
      `;
      wrap.appendChild(cell);
    });
    slot.appendChild(wrap);
  }
}

// --- Drag & Drop ---
function makeDragEl(shape, color, shadow) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; pointer-events:none; z-index:1000;
    transform:translate(-50%,-50%);
  `;
  const maxR = Math.max(...shape.map(([r]) => r));
  const maxC = Math.max(...shape.map(([,c]) => c));
  const cs   = cellSize;

  const inner = document.createElement('div');
  inner.style.cssText = `position:relative;width:${(maxC+1)*cs}px;height:${(maxR+1)*cs}px;`;
  shape.forEach(([r, c]) => {
    const cell = document.createElement('div');
    cell.style.cssText = `
      position:absolute;
      left:${c*cs}px; top:${r*cs}px;
      width:${cs-2}px; height:${cs-2}px;
      background:${color}; border-radius:6px;
      box-shadow:0 3px 0 ${shadow};
      opacity:0.9;
    `;
    inner.appendChild(cell);
  });
  el.appendChild(inner);
  document.body.appendChild(el);
  return el;
}

function startDrag(idx, clientX, clientY) {
  if (gameState !== 'playing') return;
  const p = pieces[idx];
  if (!p) return;

  computeMetrics();
  const el = makeDragEl(p.shape, p.color, p.shadow);
  drag = { idx, shape: p.shape, color: p.color, shadow: p.shadow, el, previewR: -1, previewC: -1 };
  moveDrag(clientX, clientY);
  renderPieces();
}

function moveDrag(clientX, clientY) {
  if (!drag) return;
  const LIFT = cellSize * 1.8; // lift above finger on mobile
  const isMobile = window.matchMedia('(pointer:coarse)').matches;
  const vy = isMobile ? clientY - LIFT : clientY;

  drag.el.style.left = clientX + 'px';
  drag.el.style.top  = vy + 'px';

  // Compute which grid cell is under the top-left of the piece.
  // The drag element is centered at (clientX, vy) via translate(-50%,-50%),
  // so its top-left is offset by half its full size: (maxC+1)*cs/2 and (maxR+1)*cs/2.
  const maxR = Math.max(...drag.shape.map(([r]) => r));
  const maxC = Math.max(...drag.shape.map(([,c]) => c));

  const piecePixelR = vy - ((maxR + 1) * cellSize / 2);
  const piecePixelC = clientX - ((maxC + 1) * cellSize / 2);

  const baseR = Math.round((piecePixelR - boardRect.top)  / cellSize);
  const baseC = Math.round((piecePixelC - boardRect.left) / cellSize);

  drag.previewR = baseR;
  drag.previewC = baseC;
  const valid = canPlace(drag.shape, baseR, baseC);
  renderGrid(baseR, baseC, drag.shape, valid);
}

function endDrag(clientX, clientY) {
  if (!drag) return;
  const { idx, shape, previewR, previewC } = drag;
  const valid = canPlace(shape, previewR, previewC);

  drag.el.remove();
  drag = null;

  if (valid) {
    placePiece(idx, previewR, previewC);
  } else {
    renderGrid();
    renderPieces();
  }
}

// --- Events ---
function setupPieceEvents(slot, idx) {
  slot.addEventListener('mousedown', e => {
    e.preventDefault();
    startDrag(idx, e.clientX, e.clientY);
  });
  slot.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startDrag(idx, t.clientX, t.clientY);
  }, { passive: false });
}

document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
document.addEventListener('mouseup',   e => endDrag(e.clientX, e.clientY));
document.addEventListener('touchmove', e => {
  if (!drag) return;
  e.preventDefault();
  const t = e.touches[0];
  moveDrag(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchend', e => {
  if (!drag) return;
  const t = e.changedTouches[0];
  endDrag(t.clientX, t.clientY);
});
document.addEventListener('touchcancel', () => {
  if (!drag) return;
  drag.el.remove();
  drag = null;
  renderGrid();
  renderPieces();
});

document.getElementById('newBtn').addEventListener('click', init);
document.getElementById('retryBtn').addEventListener('click', init);

window.addEventListener('resize', () => {
  computeMetrics();
  renderGrid();
  renderPieces();
});

window.addEventListener('load', () => {
  // Build grid cells
  const gridEl = document.getElementById('pdGrid');
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'pd-cell';
      gridEl.appendChild(cell);
    }
  }
  // Setup piece slot events
  for (let i = 0; i < 3; i++) {
    setupPieceEvents(document.getElementById(`piece-${i}`), i);
  }
  init();
});
