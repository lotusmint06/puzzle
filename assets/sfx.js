// Tiny Web Audio sound module + haptic.
// Usage: SFX.tap(), SFX.success(), SFX.win(), etc.
// Mute button: <button data-sfx-toggle onclick="toggleSfx(this)">🔊</button>
(function() {
  let ctx = null;
  let muted = localStorage.getItem('sfx-muted') === '1';

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, opts={}) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const { type='sine', vol=0.18, attack=0.005, decay=duration } = opts;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function chord(freqs, duration, opts) {
    freqs.forEach(f => tone(f, duration, opts));
  }

  function seq(notes, dur, gap, opts) {
    notes.forEach((f, i) => setTimeout(() => tone(f, dur, opts), i * gap));
  }

  function buzz(ms=10) {
    if (muted) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  window.SFX = {
    tap()     { tone(640, 0.05, { type:'square', vol:0.10 }); },
    pop()     { tone(880, 0.08, { type:'sine',   vol:0.15 }); },
    click()   { tone(420, 0.04, { type:'sine',   vol:0.08 }); },
    place()   { tone(520, 0.07, { type:'triangle', vol:0.14 }); },
    success() { chord([523, 659, 784], 0.18, { type:'sine', vol:0.12 }); },
    error()   { tone(180, 0.18, { type:'sawtooth', vol:0.14 }); buzz(15); },
    win()     { seq([523, 659, 784, 1047], 0.20, 110, { type:'sine', vol:0.16 }); buzz(20); },
    lose()    { seq([523, 415, 311, 247], 0.28, 140, { type:'sine', vol:0.16 }); buzz(30); },
    bump()    { tone(160, 0.06, { type:'square', vol:0.12 }); buzz(8); },

    isMuted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('sfx-muted', muted ? '1' : '0'); } catch (_) {}
    },
    toggle() { this.setMuted(!muted); return muted; },
  };

  window.toggleSfx = function(btn) {
    const m = SFX.toggle();
    if (btn) btn.textContent = m ? '🔇' : '🔊';
    return m;
  };

  function initToggleButtons() {
    document.querySelectorAll('[data-sfx-toggle]').forEach(b => {
      b.textContent = SFX.isMuted() ? '🔇' : '🔊';
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initToggleButtons);
  else
    initToggleButtons();

  // Resume audio on first user gesture
  const resume = () => ensureCtx();
  document.addEventListener('pointerdown', resume, { once:true, passive:true });
  document.addEventListener('keydown',     resume, { once:true });

  // Auto-tap sound on common UI buttons (excluding the mute toggle itself)
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.btn, .play-btn, .game-card, .diff-btn, .dpad-btn');
    if (t && !t.hasAttribute('data-sfx-toggle')) SFX.tap();
  }, { passive: true });
})();
