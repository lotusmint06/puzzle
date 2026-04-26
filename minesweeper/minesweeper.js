const LEVELS = {
  easy:   { cols: 9,  rows: 9,  mines: 10 },
  medium: { cols: 12, rows: 12, mines: 25 },
  hard:   { cols: 16, rows: 16, mines: 50 },
};

let level = localStorage.getItem('ms_level') || 'easy';
let touchMode = 'open'; // 'open' | 'flag'
let board, revealed, flagged, mineCount, gameState, timerInterval, seconds, firstClick;

function setMode(mode) {
  touchMode = mode;
  document.getElementById('modeOpen').classList.toggle('active', mode === 'open');
  document.getElementById('modeFlag').classList.toggle('active', mode === 'flag');
}

function bestKey() { return `ms_best_${level}`; }

function init(newLevel) {
  if (newLevel) {
    level = newLevel;
    localStorage.setItem('ms_level', level);
  }
  document.querySelectorAll('.level-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.level === level));

  const { cols, rows, mines } = LEVELS[level];
  mineCount  = mines;
  gameState  = 'idle';
  firstClick = true;
  seconds    = 0;
  clearInterval(timerInterval);

  board    = Array.from({length: rows}, () => Array(cols).fill(0));
  revealed = Array.from({length: rows}, () => Array(cols).fill(false));
  flagged  = Array.from({length: rows}, () => Array(cols).fill(false));

  updateMineCounter();
  updateTimer();
  document.getElementById('overlay').classList.remove('show');
  renderBoard();
}

function placeMines(safeR, safeC) {
  const { cols, rows, mines } = LEVELS[level];
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (Math.abs(r - safeR) > 1 || Math.abs(c - safeC) > 1) cells.push([r, c]);

  shuffle(cells);
  const actualMines = Math.min(mines, cells.length);
  for (let i = 0; i < actualMines; i++) {
    const [r, c] = cells[i];
    board[r][c] = -1;
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (board[r][c] !== -1) board[r][c] = countAdj(r, c);
}

function countAdj(r, c) {
  const { cols, rows } = LEVELS[level];
  let n = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r+dr, nc = c+dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === -1) n++;
    }
  return n;
}

function reveal(r, c) {
  const { cols, rows } = LEVELS[level];
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  if (revealed[r][c] || flagged[r][c]) return;
  revealed[r][c] = true;
  if (board[r][c] === 0)
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) reveal(r+dr, c+dc);
}

function handleClick(r, c) {
  if (gameState === 'dead' || gameState === 'won') return;
  if (flagged[r][c]) return;

  if (firstClick) {
    firstClick = false;
    gameState  = 'playing';
    placeMines(r, c);
    startTimer();
  }

  if (board[r][c] === -1) {
    revealAll();
    revealed[r][c] = true;
    gameState = 'dead';
    clearInterval(timerInterval);
    renderBoard();
    showOverlay('lose', r, c);
    return;
  }

  reveal(r, c);
  renderBoard();
  checkWin();
}

function handleFlag(r, c) {
  if (gameState === 'dead' || gameState === 'won') return;
  if (revealed[r][c]) return;
  flagged[r][c] = !flagged[r][c];
  updateMineCounter();
  renderBoard();
}

function revealAll() {
  const { cols, rows } = LEVELS[level];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (board[r][c] === -1) revealed[r][c] = true;
}

function checkWin() {
  const { cols, rows, mines } = LEVELS[level];
  let unrevealedSafe = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!revealed[r][c] && board[r][c] !== -1) unrevealedSafe++;
  if (unrevealedSafe === 0) {
    gameState = 'won';
    clearInterval(timerInterval);
    const best = parseInt(localStorage.getItem(bestKey()) || '9999');
    if (seconds < best) localStorage.setItem(bestKey(), seconds);
    showOverlay('win');
  }
}

function startTimer() {
  timerInterval = setInterval(() => { seconds++; updateTimer(); }, 1000);
}

function updateTimer() {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  document.getElementById('timerDisplay').textContent =
    `${m}:${s.toString().padStart(2, '0')}`;
}

function updateMineCounter() {
  const { cols, rows } = LEVELS[level];
  let flags = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (flagged[r][c]) flags++;
  document.getElementById('mineCounter').textContent = mineCount - flags;
}

function showOverlay(type, deadR, deadC) {
  const overlay = document.getElementById('overlay');
  document.getElementById('overlayEmoji').textContent  = type === 'win' ? '🎉' : '💥';
  document.getElementById('overlayTitle').textContent  = type === 'win' ? '클리어!' : '펑!';
  document.getElementById('overlaySub').textContent    =
    type === 'win' ? `${seconds}초 만에 클리어했어요!` : '지뢰를 밟았어요...';
  overlay.classList.add('show');
}

// --- Render ---
const NUM_COLORS = ['', '#4d96ff','#6bcb77','#ff6b6b','#9b59b6','#c0392b','#16a085','#2c3e50','#7f8c8d'];

function renderBoard() {
  const { cols, rows } = LEVELS[level];
  const wrap = document.getElementById('boardWrap');
  wrap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  wrap.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (revealed[r][c]) {
        cell.classList.add('revealed');
        if (board[r][c] === -1) {
          cell.classList.add('mine');
          cell.textContent = '💣';
        } else if (board[r][c] > 0) {
          cell.textContent = board[r][c];
          cell.style.color = NUM_COLORS[board[r][c]];
        }
      } else if (flagged[r][c]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
      }

      cell.addEventListener('click', () => {
        if (touchMode === 'flag') handleFlag(r, c);
        else handleClick(r, c);
      });
      cell.addEventListener('contextmenu', e => { e.preventDefault(); handleFlag(r, c); });

      wrap.appendChild(cell);
    }
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

document.getElementById('newBtn').addEventListener('click', () => init());
document.getElementById('retryBtn').addEventListener('click', () => init());

window.addEventListener('load', () => init());
