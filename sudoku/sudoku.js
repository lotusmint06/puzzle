const GRID_CONFIGS = {
  '4': { size: 4, boxRows: 2, boxCols: 2 },
  '6': { size: 6, boxRows: 2, boxCols: 3 },
  '9': { size: 9, boxRows: 3, boxCols: 3 },
};

const CLUES = {
  '4': { easy: 12, medium: 10, hard: 7  },
  '6': { easy: 24, medium: 18, hard: 13 },
  '9': { easy: 38, medium: 30, hard: 24 },
};

let gridSize    = localStorage.getItem('sudoku_size')   || '9';
let difficulty  = localStorage.getItem('sudoku_diff')   || 'easy';
let puzzle, solution, givenCells, memos, selected, mistakes, gameState, seconds, timerInterval;
let memoMode = false;

function toggleMemo() {
  memoMode = !memoMode;
  document.getElementById('memoBtn').classList.toggle('active', memoMode);
}

function cfg()     { return GRID_CONFIGS[gridSize]; }
function bestKey() { return `sudoku_best_${gridSize}_${difficulty}`; }

function init(newSize, newDiff) {
  if (newSize) { gridSize = newSize;   localStorage.setItem('sudoku_size', newSize); }
  if (newDiff) { difficulty = newDiff; localStorage.setItem('sudoku_diff', newDiff); }

  document.querySelectorAll('.size-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.size === gridSize));
  document.querySelectorAll('.diff-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.diff === difficulty));

  selected  = null;
  mistakes  = 0;
  seconds   = 0;
  memoMode  = false;
  gameState = 'playing';
  clearInterval(timerInterval);
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('mistakeDisplay').textContent = '0';
  document.getElementById('memoBtn').classList.remove('active');

  const base = generateSolved();
  solution   = base.map(r => [...r]);
  puzzle     = removeCells(base, CLUES[gridSize][difficulty]);
  givenCells = puzzle.map(r => r.map(v => v !== 0));
  const { size } = cfg();
  memos = Array.from({length: size}, () =>
    Array.from({length: size}, () => new Set())
  );

  startTimer();
  renderBoard();
  renderNumpad();
}

// --- Generator ---
function generateSolved() {
  const { size } = cfg();
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  solvePuzzle(grid);
  return grid;
}

function solvePuzzle(grid) {
  const { size } = cfg();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      const nums = shuffle(Array.from({length: size}, (_, i) => i + 1));
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (solvePuzzle(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function isValid(grid, r, c, n) {
  const { size, boxRows, boxCols } = cfg();
  for (let i = 0; i < size; i++) {
    if (grid[r][i] === n) return false;
    if (grid[i][c] === n) return false;
    const br = boxRows * Math.floor(r / boxRows) + Math.floor(i / boxCols);
    const bc = boxCols * Math.floor(c / boxCols) + (i % boxCols);
    if (grid[br][bc] === n) return false;
  }
  return true;
}

function removeCells(grid, clues) {
  const { size } = cfg();
  const result = grid.map(r => [...r]);
  const cells  = shuffle([...Array(size * size).keys()]);
  const target = size * size - clues;
  let removed  = 0;
  for (const idx of cells) {
    if (removed >= target) break;
    const r = Math.floor(idx / size), c = idx % size;
    result[r][c] = 0;
    removed++;
  }
  return result;
}

// --- Game Logic ---
function selectCell(r, c) {
  selected = { r, c };
  renderBoard();
}

function inputNumber(n) {
  if (!selected || gameState !== 'playing') return;
  const { r, c } = selected;
  if (givenCells[r][c]) return;

  if (memoMode) {
    if (n === 0) { memos[r][c].clear(); }
    else if (memos[r][c].has(n)) { memos[r][c].delete(n); }
    else { memos[r][c].add(n); }
    renderBoard();
    return;
  }

  if (n === 0) { puzzle[r][c] = 0; renderBoard(); return; }

  puzzle[r][c] = n;
  memos[r][c].clear();

  if (n !== solution[r][c]) {
    mistakes++;
    document.getElementById('mistakeDisplay').textContent = mistakes;
    if (mistakes >= 3) {
      gameState = 'dead';
      clearInterval(timerInterval);
      showOverlay('lose');
      renderBoard();
      return;
    }
  }
  renderBoard();
  checkWin();
}

function checkWin() {
  const { size } = cfg();
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (puzzle[r][c] !== solution[r][c]) return;
  gameState = 'won';
  clearInterval(timerInterval);
  const best = parseInt(localStorage.getItem(bestKey()) || '99999');
  if (seconds < best) localStorage.setItem(bestKey(), seconds);
  showOverlay('win');
}

function showOverlay(type) {
  document.getElementById('overlayEmoji').textContent = type === 'win' ? '🎉' : '😢';
  document.getElementById('overlayTitle').textContent = type === 'win' ? '완성!' : '실패...';
  document.getElementById('overlaySub').textContent   =
    type === 'win' ? `${fmtTime(seconds)} 만에 완성했어요!` : '실수 3번으로 게임 오버!';
  document.getElementById('overlay').classList.add('show');
}

function startTimer() {
  timerInterval = setInterval(() => { seconds++; updateTimer(); }, 1000);
}
function updateTimer() {
  document.getElementById('timerDisplay').textContent = fmtTime(seconds);
}
function fmtTime(s) {
  return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

// --- Render ---
function renderBoard() {
  const { size, boxRows, boxCols } = cfg();
  const wrap = document.getElementById('sudokuBoard');
  wrap.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  wrap.innerHTML = '';

  const selVal = selected ? puzzle[selected.r][selected.c] : 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell';

      const isGiv  = givenCells[r][c];
      const isSel  = selected && selected.r === r && selected.c === c;
      const val    = puzzle[r][c];
      const isWrong = val && !isGiv && val !== solution[r][c];
      const isSameNum = selVal && val === selVal && !isSel;
      const isRelated = selected && (
        selected.r === r || selected.c === c ||
        (Math.floor(selected.r / boxRows) === Math.floor(r / boxRows) &&
         Math.floor(selected.c / boxCols) === Math.floor(c / boxCols))
      );

      if (isSel)          cell.classList.add('sel');
      else if (isSameNum) cell.classList.add('same-num');
      else if (isRelated) cell.classList.add('related');

      if (isGiv)   cell.classList.add('given');
      if (isWrong) cell.classList.add('wrong');
      if (c > 0 && c % boxCols === 0) cell.classList.add('box-left');
      if (r > 0 && r % boxRows === 0) cell.classList.add('box-top');

      if (val) {
        cell.textContent = val;
      } else if (memos[r][c].size > 0) {
        cell.classList.add('has-memo');
        const { size, boxCols } = cfg();
        const memoGrid = document.createElement('div');
        memoGrid.className = 'memo-grid';
        memoGrid.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(size))}, 1fr)`;
        for (let n = 1; n <= size; n++) {
          const m = document.createElement('span');
          m.className = 'memo-num';
          m.textContent = memos[r][c].has(n) ? n : '';
          memoGrid.appendChild(m);
        }
        cell.appendChild(memoGrid);
      }

      cell.addEventListener('click', () => selectCell(r, c));
      wrap.appendChild(cell);
    }
  }
}

function renderNumpad() {
  const { size } = cfg();
  const pad = document.getElementById('numpad');
  pad.style.gridTemplateColumns = `repeat(${size + 1}, 1fr)`;
  pad.innerHTML = '';
  for (let n = 1; n <= size; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => inputNumber(n));
    pad.appendChild(btn);
  }
  const del = document.createElement('button');
  del.className = 'num-btn del-btn';
  del.textContent = '⌫';
  del.addEventListener('click', () => inputNumber(0));
  pad.appendChild(del);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

document.addEventListener('keydown', e => {
  if (gameState !== 'playing' || !selected) return;
  const { size } = cfg();
  const n = parseInt(e.key);
  if (n >= 1 && n <= size) inputNumber(n);
  if (e.key === 'Backspace' || e.key === 'Delete') inputNumber(0);
  const { r, c } = selected;
  if (e.key === 'ArrowUp'    && r > 0)      selectCell(r-1, c);
  if (e.key === 'ArrowDown'  && r < size-1) selectCell(r+1, c);
  if (e.key === 'ArrowLeft'  && c > 0)      selectCell(r, c-1);
  if (e.key === 'ArrowRight' && c < size-1) selectCell(r, c+1);
});

document.getElementById('newBtn').addEventListener('click', () => init());
document.getElementById('retryBtn').addEventListener('click', () => init());

window.addEventListener('load', () => init());
