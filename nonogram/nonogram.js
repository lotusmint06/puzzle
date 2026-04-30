const PUZZLES = [
  { label: '하트', emoji: '❤️', grid: [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ]},
  { label: '집', emoji: '🏠', grid: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [1,0,1,0,1],
    [1,1,1,1,1],
  ]},
  { label: '나무', emoji: '🌲', grid: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ]},
  { label: '다이아몬드', emoji: '💎', grid: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ]},
  { label: '왕관', emoji: '👑', grid: [
    [1,0,1,0,1],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,1,1,1,0],
  ]},
  { label: '달', emoji: '🌙', grid: [
    [0,1,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,0],
    [1,0,0,1,0],
    [0,1,1,0,0],
  ]},
  { label: '십자가', emoji: '➕', grid: [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ]},
  { label: '화살표', emoji: '➡️', grid: [
    [0,0,0,1,0],
    [0,0,1,1,0],
    [1,1,1,1,1],
    [0,0,1,1,0],
    [0,0,0,1,0],
  ]},
  { label: '꽃', emoji: '🌸', grid: [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,0,1,0],
  ]},
  { label: '번개', emoji: '⚡', grid: [
    [0,0,1,1,0],
    [0,0,1,0,0],
    [0,1,1,0,0],
    [0,1,0,0,0],
    [1,1,0,0,0],
  ]},
  { label: '눈꽃', emoji: '❄️', grid: [
    [1,0,1,0,1],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [1,0,1,0,1],
  ]},
  { label: '스마일', emoji: '😊', grid: [
    [0,1,0,1,0],
    [0,1,0,1,0],
    [0,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ]},
  { label: '사람', emoji: '🚶', grid: [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [0,1,0,1,0],
  ]},
  { label: '물고기', emoji: '🐟', grid: [
    [1,1,0,0,0],
    [0,0,1,0,1],
    [0,0,1,1,1],
    [0,0,1,0,1],
    [1,1,0,0,0],
  ]},
  { label: '편지', emoji: '✉️', grid: [
    [1,1,1,1,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
  ]},
  { label: '컵', emoji: '☕', grid: [
    [1,1,1,1,0],
    [1,0,0,1,1],
    [1,0,0,1,0],
    [1,1,1,1,0],
    [0,1,1,0,0],
  ]},
];

let currentIdx = 0;
let userGrid = [];
let isDragging = false;
let dragState = 0;
let lastDragR = -1, lastDragC = -1;

function getHints(puzzle) {
  const grid = puzzle.grid;
  const COLS = grid[0].length;

  const rowHints = grid.map(row => {
    const h = []; let cnt = 0;
    for (const v of row) { if (v) cnt++; else if (cnt) { h.push(cnt); cnt = 0; } }
    if (cnt) h.push(cnt);
    return h.length ? h : [0];
  });

  const colHints = Array.from({length: COLS}, (_, col) => {
    const h = []; let cnt = 0;
    for (const row of grid) {
      if (row[col]) cnt++; else if (cnt) { h.push(cnt); cnt = 0; }
    }
    if (cnt) h.push(cnt);
    return h.length ? h : [0];
  });

  return { rowHints, colHints };
}

function initPuzzle(idx) {
  currentIdx = ((idx % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  const puzzle = PUZZLES[currentIdx];
  const ROWS = puzzle.grid.length, COLS = puzzle.grid[0].length;
  userGrid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  document.getElementById('overlay').classList.remove('show');
  renderBoard();
  document.getElementById('puzzleNum').textContent = `${currentIdx + 1} / ${PUZZLES.length}`;
}

function renderBoard() {
  const puzzle = PUZZLES[currentIdx];
  const ROWS = puzzle.grid.length, COLS = puzzle.grid[0].length;
  const { rowHints, colHints } = getHints(puzzle);

  const boardEl = document.getElementById('nonoBoard');
  boardEl.style.gridTemplateColumns = `var(--hint-w) repeat(${COLS}, var(--cs))`;
  boardEl.style.gridTemplateRows = `var(--hint-h) repeat(${ROWS}, var(--cs))`;
  boardEl.innerHTML = '';

  // corner
  boardEl.appendChild(Object.assign(document.createElement('div'), {className: 'nono-corner'}));

  // col hints
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.className = 'nono-col-hint';
    el.id = `ch-${c}`;
    el.innerHTML = colHints[c].map(n => `<span>${n}</span>`).join('');
    boardEl.appendChild(el);
  }

  // rows
  for (let r = 0; r < ROWS; r++) {
    const rh = document.createElement('div');
    rh.className = 'nono-row-hint';
    rh.id = `rh-${r}`;
    rh.innerHTML = rowHints[r].map(n => `<span>${n}</span>`).join('');
    boardEl.appendChild(rh);

    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'nono-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      boardEl.appendChild(cell);
    }
  }
}

function applyState(r, c, state) {
  const puzzle = PUZZLES[currentIdx];
  const ROWS = puzzle.grid.length, COLS = puzzle.grid[0].length;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

  userGrid[r][c] = state;
  const cell = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;

  cell.className = 'nono-cell';
  cell.textContent = '';
  if (state === 1) cell.classList.add('filled');
  else if (state === 2) { cell.classList.add('marked'); cell.textContent = '✕'; }

  updateHint('row', r);
  updateHint('col', c);
  checkWin();
}

function updateHint(type, idx) {
  const puzzle = PUZZLES[currentIdx];
  const ROWS = puzzle.grid.length, COLS = puzzle.grid[0].length;
  let solved;

  if (type === 'row') {
    solved = puzzle.grid[idx].every((v, c) => (v === 1) === (userGrid[idx][c] === 1));
    document.getElementById(`rh-${idx}`)?.classList.toggle('hint-done', solved);
  } else {
    solved = Array.from({length: ROWS}, (_, r) => r)
      .every(r => (puzzle.grid[r][idx] === 1) === (userGrid[r][idx] === 1));
    document.getElementById(`ch-${idx}`)?.classList.toggle('hint-done', solved);
  }
}

function checkWin() {
  const puzzle = PUZZLES[currentIdx];
  const won = puzzle.grid.every((row, r) =>
    row.every((v, c) => (v === 1) === (userGrid[r][c] === 1))
  );
  if (won) {
    setTimeout(() => {
      document.getElementById('revealEmoji').textContent = puzzle.emoji;
      document.getElementById('revealLabel').textContent = puzzle.label;
      document.getElementById('overlay').classList.add('show');
    }, 200);
  }
}

window.addEventListener('load', () => {
  const boardEl = document.getElementById('nonoBoard');

  boardEl.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.nono-cell');
    if (!cell) return;
    e.preventDefault();
    boardEl.setPointerCapture(e.pointerId);

    const r = +cell.dataset.r, c = +cell.dataset.c;
    dragState = (userGrid[r][c] + 1) % 3;
    lastDragR = r; lastDragC = c;
    isDragging = true;
    applyState(r, c, dragState);
  });

  boardEl.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.nono-cell');
    if (!el) return;
    const r = +el.dataset.r, c = +el.dataset.c;
    if (r === lastDragR && c === lastDragC) return;
    lastDragR = r; lastDragC = c;
    applyState(r, c, dragState);
  }, { passive: false });

  boardEl.addEventListener('pointerup', () => { isDragging = false; });
  boardEl.addEventListener('pointercancel', () => { isDragging = false; });

  document.getElementById('prevBtn').addEventListener('click', () => initPuzzle(currentIdx - 1));
  document.getElementById('nextBtn').addEventListener('click', () => initPuzzle(currentIdx + 1));
  document.getElementById('nextPuzzleBtn').addEventListener('click', () => initPuzzle(currentIdx + 1));
  document.getElementById('retryBtn').addEventListener('click', () => initPuzzle(currentIdx));

  initPuzzle(0);
});
