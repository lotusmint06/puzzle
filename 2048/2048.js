const SLIDE_MS = 120;
let GRID = parseInt(localStorage.getItem('2048grid') || '4');

let board, score, best, mergeStreak, continued, undoCount, currentTheme;
let prevBoard, prevTileIdGrid, prevScore, prevStreak;
let tileIdGrid;
let tileEls = {};
let nextId = 1;

let timerDuration = parseInt(localStorage.getItem('2048timer') || '0'); // 0=off, seconds
let timeLeft = 0;
let timerInterval = null;
let timerStarted = false;

const THEMES = {
  animal: {
    2:'🐣', 4:'🐥', 8:'🐔', 16:'🦆', 32:'🦢', 64:'🦩',
    128:'🦅', 256:'🦁', 512:'🐘', 1024:'🦕', 2048:'🐉', high:'🌟'
  },
  building: {
    2:'🏠', 4:'🏡', 8:'🏘️', 16:'🏗️', 32:'🏢', 64:'🏬',
    128:'🏯', 256:'🏰', 512:'🗼', 1024:'🗽', 2048:'🏛️', high:'🌆'
  }
};

const WIN_TARGET = { 3: 1024, 4: 2048, 5: 4096 };

function bestKey() { return `2048best_${GRID}`; }

function init(fresh = true) {
  if (fresh) {
    const boardEl = document.getElementById('board');
    boardEl.style.gridTemplateColumns = `repeat(${GRID}, 1fr)`;
    boardEl.style.gridTemplateRows    = `repeat(${GRID}, 1fr)`;

    board = Array.from({length: GRID}, () => Array(GRID).fill(0));
    tileIdGrid = Array.from({length: GRID}, () => Array(GRID).fill(0));
    Object.values(tileEls).forEach(el => el.remove());
    tileEls = {};
    nextId = 1;
    score = 0;
    mergeStreak = 0;
    continued = false;
    undoCount = 3;
    prevBoard = null;
    prevTileIdGrid = null;
    prevScore = 0;
    initCells();
    addTile(); addTile();
    stopTimer();
    timerStarted = false;
    if (timerDuration > 0) {
      timeLeft = timerDuration;
      updateTimerDisplay();
    }
  }

  currentTheme = localStorage.getItem('2048theme') || 'number';
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
  });
  document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.grid) === GRID);
  });

  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.timer) === timerDuration);
  });

  best = parseInt(localStorage.getItem(bestKey()) || '0');
  updateScoreUI();
  updateStreakUI();
  updateUndoBtn();
  updateTimerDisplay();
  hideOverlays();
  renderBoard();
}

function setTimer(secs) {
  timerDuration = secs;
  localStorage.setItem('2048timer', secs);
  document.getElementById('settingsOverlay').classList.remove('show');
  init(true);
}

function startTimer() {
  timeLeft = timerDuration;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      setTimeout(showLose, 100);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  if (timerDuration === 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  const m = Math.floor(Math.max(timeLeft, 0) / 60);
  const s = Math.max(timeLeft, 0) % 60;
  el.textContent = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
  el.classList.toggle('urgent', timeLeft <= 10 && timerDuration > 0);
}

function setGrid(n) {
  GRID = n;
  localStorage.setItem('2048grid', n);
  document.getElementById('settingsOverlay').classList.remove('show');
  init(true);
}

function initCells() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  for (let i = 0; i < GRID * GRID; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.appendChild(cell);
  }
}

function savePrev() {
  prevBoard      = board.map(r => [...r]);
  prevTileIdGrid = tileIdGrid.map(r => [...r]);
  prevScore      = score;
  prevStreak     = mergeStreak;
}

function undo() {
  if (undoCount <= 0 || !prevBoard) return;
  board      = prevBoard.map(r => [...r]);
  tileIdGrid = prevTileIdGrid.map(r => [...r]);
  score      = prevScore;
  mergeStreak = prevStreak;
  prevBoard  = null;
  undoCount--;
  Object.values(tileEls).forEach(el => el.remove());
  tileEls = {};
  updateScoreUI();
  updateStreakUI();
  updateUndoBtn();
  renderBoard();
}

function updateUndoBtn() {
  const btn = document.getElementById('undoBtn');
  btn.textContent = `↩ 되돌리기 (${undoCount})`;
  btn.disabled = undoCount <= 0 || !prevBoard;
  btn.style.opacity = btn.disabled ? '0.45' : '1';
}

function addTile() {
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.85 ? 2 : 4;
  const id = nextId++;
  tileIdGrid[r][c] = id;
  return { r, c, id };
}

function slide(valRow, idRow) {
  let pairs = [];
  for (let i = 0; i < valRow.length; i++) {
    if (valRow[i]) pairs.push({ v: valRow[i], id: idRow[i] });
  }
  let merged = false, mergedScore = 0, removedIds = [];
  for (let i = 0; i < pairs.length - 1; i++) {
    if (pairs[i].v === pairs[i+1].v) {
      pairs[i].v *= 2;
      mergedScore += pairs[i].v;
      removedIds.push({ id: pairs[i+1].id, absorbedBy: pairs[i].id, pts: pairs[i].v });
      pairs.splice(i+1, 1);
      merged = true;
    }
  }
  while (pairs.length < GRID) pairs.push({ v: 0, id: 0 });
  return { vals: pairs.map(p => p.v), ids: pairs.map(p => p.id), merged, mergedScore, removedIds };
}

function move(dir) {
  savePrev();
  let moved = false, totalMerged = 0;
  let allRemovedIds = [];

  for (let i = 0; i < GRID; i++) {
    let valRow, idRow;
    if (dir === 'left')  { valRow = board[i].slice();               idRow = tileIdGrid[i].slice(); }
    if (dir === 'right') { valRow = board[i].slice().reverse();     idRow = tileIdGrid[i].slice().reverse(); }
    if (dir === 'up')    { valRow = board.map(r => r[i]);           idRow = tileIdGrid.map(r => r[i]); }
    if (dir === 'down')  { valRow = board.map(r => r[i]).reverse(); idRow = tileIdGrid.map(r => r[i]).reverse(); }

    const { vals, ids, merged, mergedScore, removedIds } = slide(valRow, idRow);
    allRemovedIds.push(...removedIds);

    for (let j = 0; j < GRID; j++) {
      let r, c;
      if (dir === 'up')    { r = j;        c = i; }
      if (dir === 'down')  { r = GRID-1-j; c = i; }
      if (dir === 'left')  { r = i;        c = j; }
      if (dir === 'right') { r = i;        c = GRID-1-j; }

      if (board[r][c] !== vals[j]) moved = true;
      board[r][c]      = vals[j];
      tileIdGrid[r][c] = ids[j];
    }
    if (merged) { totalMerged++; score += mergedScore; }
  }

  if (!moved) { prevBoard = null; return; }

  if (timerDuration > 0 && !timerStarted) {
    timerStarted = true;
    startTimer();
  }

  mergeStreak = totalMerged > 0 ? Math.min(mergeStreak + totalMerged, 5) : 0;
  updateScoreUI();
  updateStreakUI();
  updateUndoBtn();

  const newTileInfo = addTile();
  renderBoard(newTileInfo, allRemovedIds);
  spawnScorePopups(allRemovedIds);

  const maxVal = Math.max(...board.flat());
  const target = WIN_TARGET[GRID] ?? 2048;
  if (maxVal >= target && !continued) {
    stopTimer();
    setTimeout(() => { showWin(target); launchConfetti(); }, 350);
  } else if (isGameOver()) {
    stopTimer();
    setTimeout(showLose, 350);
  }
}

function isGameOver() {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      if (!board[r][c]) return false;
      if (c < GRID-1 && board[r][c] === board[r][c+1]) return false;
      if (r < GRID-1 && board[r][c] === board[r+1][c]) return false;
    }
  return true;
}

// --- UI ---
function tileClass(v) {
  if (v <= 2048) return 't' + v;
  return 'thigh';
}

function tileFontSize(v) {
  const m = GRID === 3 ? 1.15 : GRID === 5 ? 0.75 : 1;
  if (v < 100)   return `clamp(${Math.round(28*m)}px,${(8*m).toFixed(1)}vw,${Math.round(44*m)}px)`;
  if (v < 1000)  return `clamp(${Math.round(22*m)}px,${(6*m).toFixed(1)}vw,${Math.round(36*m)}px)`;
  if (v < 10000) return `clamp(${Math.round(20*m)}px,${(5.6*m).toFixed(1)}vw,${Math.round(31*m)}px)`;
  return `clamp(${Math.round(16*m)}px,${(4.5*m).toFixed(1)}vw,${Math.round(26*m)}px)`;
}

function emojiSize() {
  if (GRID === 3) return 'clamp(28px,8vw,42px)';
  if (GRID === 5) return 'clamp(14px,4vw,24px)';
  return 'clamp(22px,6.5vw,36px)';
}

function setTileContent(el, v) {
  if (currentTheme === 'number') {
    el.style.fontSize = tileFontSize(v);
    el.textContent = v;
  } else {
    el.style.fontSize = '';
    const map = THEMES[currentTheme];
    const emoji = map[v] ?? map.high;
    const numSize = GRID === 5 ? 'clamp(8px,2vw,11px)' : GRID === 3 ? 'clamp(11px,3vw,15px)' : '';
    el.innerHTML =
      `<span class="tile-emoji" style="font-size:${emojiSize()}">${emoji}</span>` +
      `<span class="tile-num"${numSize ? ` style="font-size:${numSize}"` : ''}>${v}</span>`;
  }
}

function getMetrics() {
  const boardEl = document.getElementById('board');
  const gap  = parseFloat(getComputedStyle(boardEl).gap) || 10;
  const pad  = parseFloat(getComputedStyle(boardEl).padding) || 10;
  const cellW = (boardEl.offsetWidth  - pad*2 - gap*(GRID-1)) / GRID;
  const cellH = (boardEl.offsetHeight - pad*2 - gap*(GRID-1)) / GRID;
  return { gap, pad, cellW, cellH };
}

function renderBoard(newTileInfo = null, removedIds = []) {
  const layer   = document.getElementById('tilesLayer');
  const { gap, pad, cellW, cellH } = getMetrics();

  const pos = (r, c) => ({
    left: pad + c * (cellW + gap),
    top:  pad + r * (cellH + gap)
  });

  const idToPos = {};
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (tileIdGrid[r][c]) idToPos[tileIdGrid[r][c]] = { r, c };

  const mergedSurvivorIds = new Set(removedIds.map(ri => ri.absorbedBy));

  for (const { id, absorbedBy } of removedIds) {
    const el = tileEls[id];
    if (!el) continue;
    const dest = idToPos[absorbedBy];
    if (dest) {
      const { left, top } = pos(dest.r, dest.c);
      el.style.left = left + 'px';
      el.style.top  = top  + 'px';
    }
    el.style.zIndex = '1';
    setTimeout(() => { el.remove(); delete tileEls[id]; }, SLIDE_MS + 40);
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const v  = board[r][c];
      const id = tileIdGrid[r][c];
      if (!v || !id) continue;

      const { left, top } = pos(r, c);
      const isSurvivor = mergedSurvivorIds.has(id);
      const isNew      = newTileInfo && newTileInfo.id === id;
      let el = tileEls[id];

      if (!el) {
        el = document.createElement('div');
        el.style.left   = left + 'px';
        el.style.top    = top  + 'px';
        el.style.width  = cellW + 'px';
        el.style.height = cellH + 'px';
        el.style.zIndex = '2';
        layer.appendChild(el);
        tileEls[id] = el;
        el.className = 'tile ' + tileClass(v);
        setTileContent(el, v);
        if (isNew) el.classList.add('new');
      } else {
        el.style.left   = left + 'px';
        el.style.top    = top  + 'px';
        el.style.width  = cellW + 'px';
        el.style.height = cellH + 'px';

        if (isSurvivor) {
          el.style.zIndex = '2';
          setTimeout(() => {
            el.className = 'tile ' + tileClass(v);
            el.classList.add('merged');
            setTileContent(el, v);
            el.style.zIndex = '';
          }, SLIDE_MS);
        }
      }
    }
  }
}

function updateScoreUI() {
  document.getElementById('scoreDisplay').textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem(bestKey(), best);
  }
  document.getElementById('bestDisplay').textContent = best;
}

function updateStreakUI() {
  document.querySelectorAll('.streak-star').forEach((el, i) => {
    el.style.filter = i < mergeStreak ? 'none' : 'grayscale(1) opacity(0.3)';
    if (i === mergeStreak - 1) el.classList.add('lit');
    else el.classList.remove('lit');
  });
}

function hideOverlays() {
  document.getElementById('winOverlay').classList.remove('show');
  document.getElementById('loseOverlay').classList.remove('show');
}
function showWin(target) {
  document.getElementById('winTarget').textContent = target;
  document.getElementById('winOverlay').classList.add('show');
}
function showLose() {
  document.getElementById('loseScore').textContent = `최종 점수: ${score}점`;
  document.getElementById('loseOverlay').classList.add('show');
}

// --- Score popup ---
function spawnScorePopups(removedIds) {
  if (!removedIds.length) return;
  const wrapEl  = document.getElementById('boardWrap');
  const rect    = wrapEl.getBoundingClientRect();
  const { gap, pad, cellW, cellH } = getMetrics();

  const seen = new Set();
  for (const { absorbedBy, pts } of removedIds) {
    if (seen.has(absorbedBy)) continue;
    seen.add(absorbedBy);
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (tileIdGrid[r][c] !== absorbedBy) continue;
        const el = document.createElement('div');
        el.className   = 'score-popup';
        el.textContent = '+' + pts;
        el.style.left  = (rect.left + pad + c * (cellW + gap) + cellW / 2) + 'px';
        el.style.top   = (rect.top  + pad + r * (cellH + gap) + cellH / 2) + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 900);
        break;
      }
    }
  }
}

// --- Confetti ---
function launchConfetti() {
  const wrap   = document.getElementById('confettiWrap');
  const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#a78bfa','#ff9f43'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left              = Math.random() * 100 + 'vw';
    el.style.top               = '-20px';
    el.style.background        = colors[Math.floor(Math.random() * colors.length)];
    el.style.width             = (6 + Math.random() * 10) + 'px';
    el.style.height            = (6 + Math.random() * 10) + 'px';
    el.style.borderRadius      = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay    = (Math.random() * 0.8) + 's';
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

function spawnStarBursts() {
  const emojis = ['⭐','✨','💥','🌟','💫'];
  for (let i = 0; i < Math.min(mergeStreak, 3); i++) {
    const el = document.createElement('div');
    el.className   = 'star-burst';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left  = (20 + Math.random() * 60) + 'vw';
    el.style.top   = (20 + Math.random() * 60) + 'vh';
    el.style.animationDelay = (i * 0.12) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

// --- Theme ---
function setTheme(name) {
  currentTheme = name;
  localStorage.setItem('2048theme', name);
  document.getElementById('settingsOverlay').classList.remove('show');
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      const id = tileIdGrid[r][c];
      const v  = board[r][c];
      if (id && v && tileEls[id]) setTileContent(tileEls[id], v);
    }
}

// --- Settings ---
function toggleSettings() {
  document.getElementById('settingsOverlay').classList.toggle('show');
}
function closeSettingsOutside(e) {
  if (e.target === document.getElementById('settingsOverlay')) toggleSettings();
}

// --- Input ---
document.addEventListener('keydown', e => {
  const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
});

let touchStart = null;
document.getElementById('board').addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.getElementById('board').addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) return;
  if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
  touchStart = null;
});

document.getElementById('newBtn').addEventListener('click', () => init(true));
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('continueBtn').addEventListener('click', () => { continued = true; hideOverlays(); });
document.getElementById('winNewBtn').addEventListener('click', () => init(true));
document.getElementById('loseNewBtn').addEventListener('click', () => init(true));

window.addEventListener('resize', () => renderBoard());

requestAnimationFrame(() => init(true));
