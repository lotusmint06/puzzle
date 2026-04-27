const ROWS = 6, COLS = 7;
const HUMAN = 1, AI = 2;

const DIFFICULTY = {
  easy:   { depth: 2, randomRate: 0.4 },
  medium: { depth: 4, randomRate: 0.1 },
  hard:   { depth: 6, randomRate: 0 },
};
let difficulty = 'medium';

let board, currentTurn, gameState, isThinking;
let moveHistory = [];
const RECENT_N = 3;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function init() {
  board = emptyBoard();
  currentTurn = HUMAN;
  gameState = 'playing';
  isThinking = false;
  moveHistory = [];
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('statusMsg').textContent = '당신의 차례입니다';
  renderBoard();
}

// --- Board logic ---
function getValidCols(b) {
  return Array.from({ length: COLS }, (_, c) => c).filter(c => b[0][c] === 0);
}

function dropPiece(b, col, piece) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === 0) {
      b[r][col] = piece;
      if (b === board) moveHistory.push({ r, c: col, piece });
      return r;
    }
  }
  return -1;
}

function checkWin(b, piece) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS && [0,1,2,3].every(i => b[r][c+i] === piece)) return true;
      if (r + 3 < ROWS && [0,1,2,3].every(i => b[r+i][c] === piece)) return true;
      if (r + 3 < ROWS && c + 3 < COLS && [0,1,2,3].every(i => b[r+i][c+i] === piece)) return true;
      if (r + 3 < ROWS && c - 3 >= 0  && [0,1,2,3].every(i => b[r+i][c-i] === piece)) return true;
    }
  }
  return false;
}

function getWinCells(b, piece) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        const cells = [[r,c],[r+dr,c+dc],[r+2*dr,c+2*dc],[r+3*dr,c+3*dc]];
        if (cells.every(([rr,cc]) => rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&b[rr][cc]===piece))
          return cells;
      }
    }
  }
  return [];
}

function isBoardFull(b) {
  return b[0].every(c => c !== 0);
}

// --- AI: minimax with alpha-beta ---
function scoreWindow(window, piece) {
  const opp = piece === AI ? HUMAN : AI;
  const p = window.filter(c => c === piece).length;
  const e = window.filter(c => c === 0).length;
  const o = window.filter(c => c === opp).length;
  if (p === 4) return 100;
  if (p === 3 && e === 1) return 5;
  if (p === 2 && e === 2) return 2;
  if (o === 3 && e === 1) return -4;
  return 0;
}

function scoreBoard(b, piece) {
  let score = 0;
  // Center column preference
  const centerCol = Math.floor(COLS / 2);
  score += b.map(r => r[centerCol]).filter(c => c === piece).length * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c + 3 < COLS; c++)
      score += scoreWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], piece);
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r + 3 < ROWS; r++)
      score += scoreWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], piece);
  }
  for (let r = 0; r + 3 < ROWS; r++) {
    for (let c = 0; c + 3 < COLS; c++)
      score += scoreWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], piece);
    for (let c = 3; c < COLS; c++)
      score += scoreWindow([b[r][c],b[r+1][c-1],b[r+2][c-2],b[r+3][c-3]], piece);
  }
  return score;
}

function minimax(b, depth, alpha, beta, maximizing) {
  const validCols = getValidCols(b);
  const isTerminal = checkWin(b, AI) || checkWin(b, HUMAN) || validCols.length === 0;

  if (depth === 0 || isTerminal) {
    if (isTerminal) {
      if (checkWin(b, AI))    return { score: 1000000 };
      if (checkWin(b, HUMAN)) return { score: -1000000 };
      return { score: 0 };
    }
    return { score: scoreBoard(b, AI) };
  }

  if (maximizing) {
    let best = { score: -Infinity, col: validCols[0] };
    for (const col of validCols) {
      const nb = b.map(r => [...r]);
      dropPiece(nb, col, AI);
      const result = minimax(nb, depth - 1, alpha, beta, false);
      if (result.score > best.score) best = { score: result.score, col };
      alpha = Math.max(alpha, best.score);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = { score: Infinity, col: validCols[0] };
    for (const col of validCols) {
      const nb = b.map(r => [...r]);
      dropPiece(nb, col, HUMAN);
      const result = minimax(nb, depth - 1, alpha, beta, true);
      if (result.score < best.score) best = { score: result.score, col };
      beta = Math.min(beta, best.score);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function aiMove() {
  isThinking = true;
  document.getElementById('statusMsg').textContent = 'AI가 생각 중...';

  setTimeout(() => {
    const { depth, randomRate } = DIFFICULTY[difficulty];
    const validCols = getValidCols(board);
    let col;
    if (Math.random() < randomRate) {
      col = validCols[Math.floor(Math.random() * validCols.length)];
    } else {
      ({ col } = minimax(board, depth, -Infinity, Infinity, true));
    }
    const row = dropPiece(board, col, AI);
    renderBoard();

    if (checkWin(board, AI)) {
      gameState = 'over';
      const wins = getWinCells(board, AI);
      highlightWin(wins);
      setTimeout(() => showOverlay(false, wins), 600);
    } else if (isBoardFull(board)) {
      gameState = 'draw';
      setTimeout(() => showOverlay(null), 400);
    } else {
      currentTurn = HUMAN;
      document.getElementById('statusMsg').textContent = '당신의 차례입니다';
    }
    isThinking = false;
  }, 50);
}

// --- Render ---
function renderBoard() {
  const dot = document.getElementById('statusDot');
  if (dot) dot.classList.toggle('ai', currentTurn === AI);

  const boardEl = document.getElementById('cfBoard');
  boardEl.innerHTML = '';

  const recent = moveHistory.slice(-RECENT_N);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cf-cell';
      const piece = board[r][c];
      if (piece === HUMAN) cell.classList.add('p-human');
      else if (piece === AI) cell.classList.add('p-ai');

      const recentIdx = recent.findIndex(m => m.r === r && m.c === c);
      if (recentIdx !== -1) {
        const age = recent.length - 1 - recentIdx; // 0 = newest
        if (age === 0) cell.classList.add('just-placed');
        cell.classList.add(`recent-${age}`);
      }

      boardEl.appendChild(cell);
    }
  }
}

function updateHover(col) {
  const cells = document.querySelectorAll('.cf-cell');
  cells.forEach((cell, i) => {
    const c = i % COLS;
    const piece = board[Math.floor(i / COLS)][c];
    if (piece === 0) {
      cell.classList.toggle('p-hover', c === col && gameState === 'playing' && currentTurn === HUMAN && !isThinking);
    }
  });
}

function highlightWin(cells) {
  const allCells = document.querySelectorAll('.cf-cell');
  cells.forEach(([r, c]) => {
    allCells[r * COLS + c]?.classList.add('win-cell');
  });
}

function showOverlay(humanWon, winCells = []) {
  if (humanWon === null) {
    document.getElementById('overlayEmoji').textContent = '🤝';
    document.getElementById('overlayTitle').textContent = '무승부!';
    document.getElementById('overlayMsg').textContent = '보드가 가득 찼어요';
  } else if (humanWon) {
    document.getElementById('overlayEmoji').textContent = '🎉';
    document.getElementById('overlayTitle').textContent = '이겼어요!';
    document.getElementById('overlayMsg').textContent = 'AI를 이겼습니다!';
  } else {
    document.getElementById('overlayEmoji').textContent = '😵';
    document.getElementById('overlayTitle').textContent = '졌어요...';
    document.getElementById('overlayMsg').textContent = 'AI가 이겼습니다';
  }
  document.getElementById('overlay').classList.add('show');
}

// --- Events ---
function getCol(clientX) {
  const rect = document.getElementById('cfBoard').getBoundingClientRect();
  const col = Math.floor((clientX - rect.left) / (rect.width / COLS));
  return col >= 0 && col < COLS ? col : -1;
}

function handleHumanMove(col) {
  if (gameState !== 'playing' || currentTurn !== HUMAN || isThinking) return;
  if (col < 0 || board[0][col] !== 0) return;

  dropPiece(board, col, HUMAN);
  renderBoard();

  if (checkWin(board, HUMAN)) {
    gameState = 'over';
    const wins = getWinCells(board, HUMAN);
    highlightWin(wins);
    setTimeout(() => showOverlay(true), 600);
    return;
  }
  if (isBoardFull(board)) {
    gameState = 'draw';
    setTimeout(() => showOverlay(null), 400);
    return;
  }

  currentTurn = AI;
  aiMove();
}

window.addEventListener('load', () => {
  const boardEl = document.getElementById('cfBoard');

  boardEl.addEventListener('click', e => handleHumanMove(getCol(e.clientX)));

  boardEl.addEventListener('mousemove', e => {
    updateHover(getCol(e.clientX));
  });

  boardEl.addEventListener('mouseleave', () => {
    updateHover(-1);
  });

  boardEl.addEventListener('touchstart', e => {
    e.preventDefault();
    handleHumanMove(getCol(e.touches[0].clientX));
  }, { passive: false });

  document.getElementById('newBtn').addEventListener('click', init);
  document.getElementById('retryBtn').addEventListener('click', init);
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      difficulty = btn.dataset.d;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b === btn));
      init();
    });
  });

  init();
});
