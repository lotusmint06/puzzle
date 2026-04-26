const COLS = 20;
const ROWS = 20;
const COLORS = {
  head: '#6bcb77',
  headShadow: '#3a9a45',
  body: '#4d96ff',
  bodyShadow: '#2060c0',
  food: '#ff6b6b',
  foodShadow: '#c43c3c',
  bonus: '#ffd93d',
  bonusShadow: '#c4a000',
  bg: '#f0e6d3',
  cell: '#e8d8c0',
  board: '#ede0cc',
};

let canvas, ctx, cellSize, offsetX, offsetY;
let snake, dir, nextDir, food, bonusFood;
let score, best, gameState; // 'idle' | 'playing' | 'dead'
let loopTimer, speed;
let bonusTimer, bonusActive;

function bestKey() { return 'snakebest'; }

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  best = parseInt(localStorage.getItem(bestKey()) || '0');
  document.getElementById('bestDisplay').textContent = best;
  resize();
  gameState = 'idle';
  drawIdle();
}

function resize() {
  const wrap = document.getElementById('canvasWrap');
  const size = Math.min(wrap.clientWidth, wrap.clientHeight);
  canvas.width  = size;
  canvas.height = size;
  cellSize = Math.floor(size / COLS);
  offsetX = Math.floor((size - cellSize * COLS) / 2);
  offsetY = Math.floor((size - cellSize * ROWS) / 2);
  if (gameState === 'playing') draw();
  else if (gameState === 'idle') drawIdle();
  else if (gameState === 'dead') drawDead();
}

function dpadInput(d) {
  const map = {
    up:    {dx:0,  dy:-1},
    down:  {dx:0,  dy:1},
    left:  {dx:-1, dy:0},
    right: {dx:1,  dy:0},
  };
  const newDir = map[d];
  if (gameState !== 'playing') { startGame(); return; }
  if (newDir.dx === -dir.dx && newDir.dy === -dir.dy) return;
  nextDir = newDir;
}

function setDpad(visible) {
  document.getElementById('dpad').classList.toggle('visible', visible);
}

function startGame() {
  clearInterval(loopTimer);
  clearTimeout(bonusTimer);
  snake    = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
  dir      = {dx: 1, dy: 0};
  nextDir  = {dx: 1, dy: 0};
  score    = 0;
  speed    = 150;
  bonusFood   = null;
  bonusActive = false;
  gameState = 'playing';
  document.getElementById('scoreDisplay').textContent = 0;
  document.getElementById('overlay').classList.remove('show');
  setDpad(true);
  placeFood();
  loopTimer = setInterval(tick, speed);
}

function tick() {
  dir = {...nextDir};
  const head = {x: snake[0].x + dir.dx, y: snake[0].y + dir.dy};

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return die();
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) return die();

  snake.unshift(head);

  let grew = false;
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    grew = true;
    placeFood();
    scheduleBonus();
    updateSpeed();
  } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
    score += 30;
    grew = true;
    bonusFood = null;
    clearTimeout(bonusTimer);
  }

  if (!grew) snake.pop();

  updateScore();
  draw();
}

function die() {
  clearInterval(loopTimer);
  clearTimeout(bonusTimer);
  setDpad(false);
  gameState = 'dead';
  if (score > best) {
    best = score;
    localStorage.setItem(bestKey(), best);
    document.getElementById('bestDisplay').textContent = best;
  }
  drawDead();
  document.getElementById('finalScore').textContent = `최종 점수: ${score}점`;
  document.getElementById('overlay').classList.add('show');
}

function placeFood() {
  const empty = [];
  for (let x = 0; x < COLS; x++)
    for (let y = 0; y < ROWS; y++)
      if (!snake.some(s => s.x === x && s.y === y)) empty.push({x, y});
  if (!empty.length) { die(); return; } // 보드 가득 참 → 사실상 승리
  food = empty[Math.floor(Math.random() * empty.length)];
}

function scheduleBonus() {
  if (score < 30) return;
  clearTimeout(bonusTimer);
  bonusFood = null;
  bonusTimer = setTimeout(() => {
    const empty = [];
    for (let x = 0; x < COLS; x++)
      for (let y = 0; y < ROWS; y++)
        if (!snake.some(s => s.x === x && s.y === y) && food && !(food.x === x && food.y === y))
          empty.push({x, y});
    if (!empty.length) return;
    bonusFood = empty[Math.floor(Math.random() * empty.length)];
    bonusTimer = setTimeout(() => { bonusFood = null; draw(); }, 5000);
  }, 1000 + Math.random() * 2000);
}

function updateSpeed() {
  clearInterval(loopTimer);
  speed = Math.max(70, 150 - Math.floor(score / 50) * 10);
  loopTimer = setInterval(tick, speed);
}

function updateScore() {
  document.getElementById('scoreDisplay').textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem(bestKey(), best);
    document.getElementById('bestDisplay').textContent = best;
  }
}

// --- Drawing ---
function drawBoard() {
  ctx.fillStyle = COLORS.board;
  ctx.beginPath();
  roundRect(ctx, offsetX, offsetY, cellSize * COLS, cellSize * ROWS, 12);
  ctx.fill();

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.bg : COLORS.cell;
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;
      const r  = (x === 0 && y === 0) ? [8,0,0,0]
               : (x === COLS-1 && y === 0) ? [0,8,0,0]
               : (x === COLS-1 && y === ROWS-1) ? [0,0,8,0]
               : (x === 0 && y === ROWS-1) ? [0,0,0,8]
               : 0;
      ctx.beginPath();
      if (r) roundRectCorners(ctx, px, py, cellSize, cellSize, r);
      else ctx.rect(px, py, cellSize, cellSize);
      ctx.fill();
    }
  }
}

function drawSnake() {
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const px = offsetX + seg.x * cellSize;
    const py = offsetY + seg.y * cellSize;
    const pad = isHead ? 1 : 2;
    const radius = isHead ? cellSize * 0.35 : cellSize * 0.3;

    ctx.fillStyle = isHead ? COLORS.headShadow : COLORS.bodyShadow;
    ctx.beginPath();
    roundRect(ctx, px + pad, py + pad + 2, cellSize - pad*2, cellSize - pad*2, radius);
    ctx.fill();

    ctx.fillStyle = isHead ? COLORS.head : COLORS.body;
    ctx.beginPath();
    roundRect(ctx, px + pad, py + pad, cellSize - pad*2, cellSize - pad*2, radius);
    ctx.fill();

    // Eyes on head
    if (isHead) {
      const ex = dir.dx === 1 ? 0.65 : dir.dx === -1 ? 0.2 : 0.3;
      const ey = dir.dy === 1 ? 0.65 : dir.dy === -1 ? 0.2 : 0.3;
      const ex2 = dir.dy !== 0 ? 0.65 : ex;
      const ey2 = dir.dx !== 0 ? 0.65 : ey;
      const er = cellSize * 0.09;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(px + cellSize * ex,  py + cellSize * ey,  er, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + cellSize * ex2, py + cellSize * ey2, er, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(px + cellSize * ex  + 1, py + cellSize * ey  + 1, er*0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + cellSize * ex2 + 1, py + cellSize * ey2 + 1, er*0.5, 0, Math.PI*2); ctx.fill();
    }
  });
}

function drawFood(f, isBonus) {
  const px = offsetX + f.x * cellSize + cellSize/2;
  const py = offsetY + f.y * cellSize + cellSize/2;
  const r  = cellSize * 0.35;

  ctx.fillStyle = isBonus ? COLORS.bonusShadow : COLORS.foodShadow;
  ctx.beginPath(); ctx.arc(px, py + 2, r, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = isBonus ? COLORS.bonus : COLORS.food;
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();

  if (isBonus) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(px - r*0.25, py - r*0.25, r*0.3, 0, Math.PI*2); ctx.fill();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  if (food) drawFood(food, false);
  if (bonusFood) drawFood(bonusFood, true);
  drawSnake();
}

function drawIdle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  // Draw a decorative snake
  const demo = [{x:10,y:10},{x:9,y:10},{x:8,y:10},{x:7,y:10},{x:6,y:10}];
  const savedSnake = snake, savedDir = dir;
  snake = demo; dir = {dx:1,dy:0};
  drawSnake();
  snake = savedSnake; dir = savedDir;
}

function drawDead() {
  draw();
  ctx.fillStyle = 'rgba(240,220,200,0.6)';
  ctx.beginPath();
  roundRect(ctx, offsetX, offsetY, cellSize*COLS, cellSize*ROWS, 12);
  ctx.fill();
}

// --- Helpers ---
function roundRect(ctx, x, y, w, h, r) {
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}
function roundRectCorners(ctx, x, y, w, h, [tl, tr, br, bl]) {
  ctx.roundRect ? ctx.roundRect(x, y, w, h, [tl,tr,br,bl]) : ctx.rect(x, y, w, h);
}

// --- Input ---
document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:    {dx:0,  dy:-1},
    ArrowDown:  {dx:0,  dy:1},
    ArrowLeft:  {dx:-1, dy:0},
    ArrowRight: {dx:1,  dy:0},
    w: {dx:0,  dy:-1}, W: {dx:0,  dy:-1},
    s: {dx:0,  dy:1},  S: {dx:0,  dy:1},
    a: {dx:-1, dy:0},  A: {dx:-1, dy:0},
    d: {dx:1,  dy:0},  D: {dx:1,  dy:0},
  };
  const newDir = map[e.key];
  if (!newDir) return;
  e.preventDefault();
  if (gameState === 'idle' || gameState === 'dead') { startGame(); return; }
  if (newDir.dx === -dir.dx && newDir.dy === -dir.dy) return; // 반대 방향 무시
  nextDir = newDir;
});

let touchStart = null;
document.getElementById('gameCanvas').addEventListener('touchstart', e => {
  touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
}, {passive: true});
document.getElementById('gameCanvas').addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) {
    if (gameState !== 'playing') startGame();
    return;
  }
  if (gameState !== 'playing') { startGame(); return; }
  let newDir;
  if (absDx > absDy) newDir = dx > 0 ? {dx:1,dy:0} : {dx:-1,dy:0};
  else               newDir = dy > 0 ? {dx:0,dy:1} : {dx:0,dy:-1};
  if (newDir.dx === -dir.dx && newDir.dy === -dir.dy) return;
  nextDir = newDir;
  touchStart = null;
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);

window.addEventListener('resize', resize);

window.addEventListener('load', init);
