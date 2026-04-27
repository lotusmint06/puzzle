let secret, tries, history, gameState, DIGITS, MAX_TRIES;

function generateSecret(digits) {
  const nums = [1,2,3,4,5,6,7,8,9];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums.slice(0, digits).join('');
}

function check(sec, guess) {
  let s = 0, b = 0;
  for (let i = 0; i < sec.length; i++) {
    if (sec[i] === guess[i]) s++;
    else if (sec.includes(guess[i])) b++;
  }
  return { s, b };
}

function init(digits) {
  DIGITS = digits || DIGITS || 3;
  MAX_TRIES = DIGITS === 3 ? 9 : 12;
  secret = generateSecret(DIGITS);
  tries = 0;
  history = [];
  gameState = 'playing';

  document.getElementById('overlay').classList.remove('show');
  document.getElementById('guessInput').value = '';
  document.getElementById('guessInput').maxLength = DIGITS;
  document.getElementById('guessInput').placeholder = '0'.repeat(DIGITS);
  document.getElementById('guessInput').disabled = false;
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('triesDisplay').textContent = `0 / ${MAX_TRIES}`;
  renderHistory();
  document.getElementById('guessInput').focus();

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.d === DIGITS);
  });
}

function submitGuess() {
  if (gameState !== 'playing') return;
  const input = document.getElementById('guessInput');
  const guess = input.value.trim();

  if (!isValidGuess(guess)) {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
    return;
  }

  tries++;
  const { s, b } = check(secret, guess);
  history.unshift({ guess, s, b, n: tries });
  input.value = '';

  document.getElementById('triesDisplay').textContent = `${tries} / ${MAX_TRIES}`;
  renderHistory();

  if (s === DIGITS) {
    gameState = 'won';
    setTimeout(() => showOverlay(true), 300);
  } else if (tries >= MAX_TRIES) {
    gameState = 'lost';
    setTimeout(() => showOverlay(false), 300);
  }
}

function isValidGuess(guess) {
  if (!/^\d+$/.test(guess)) return false;
  if (guess.length !== DIGITS) return false;
  if (guess.includes('0')) return false;
  if (new Set(guess.split('')).size !== DIGITS) return false;
  return true;
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">아직 시도한 숫자가 없어요</div>';
    return;
  }
  list.innerHTML = history.map(({ guess, s, b, n }) => {
    const digits = guess.split('').map((d, i) => {
      let cls = 'digit-out';
      if (secret[i] === d) cls = 'digit-strike';
      else if (secret.includes(d)) cls = 'digit-ball';
      return `<span class="digit ${cls}">${d}</span>`;
    }).join('');

    const result = s === DIGITS
      ? `<span class="result-win">홈런!</span>`
      : `<span class="result-s">${s}S</span><span class="result-b">${b}B</span>`;

    return `<div class="history-row">
      <span class="try-num">${n}</span>
      <div class="digits-wrap">${digits}</div>
      <div class="result-wrap">${result}</div>
    </div>`;
  }).join('');
}

function showOverlay(won) {
  const msg = won
    ? `${tries}번 만에 맞혔어요!`
    : `정답은 <strong>${secret}</strong> 이었어요`;
  document.getElementById('overlayEmoji').textContent = won ? '🎉' : '😵';
  document.getElementById('overlayTitle').textContent = won ? '정답!' : '게임 오버';
  document.getElementById('overlayMsg').innerHTML = msg;
  document.getElementById('overlay').classList.add('show');
}

document.getElementById('submitBtn').addEventListener('click', submitGuess);
document.getElementById('guessInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitGuess();
});
document.getElementById('retryBtn').addEventListener('click', () => init());
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => init(+btn.dataset.d));
});

window.addEventListener('load', () => init(3));
