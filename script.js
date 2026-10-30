// Personalize these values without changing the interaction code.
const MUSIC_FILE = 'assets/music.mp3';
const LETTER = [
  'Happy 19th birthday, baobao! More birthdays to come! And also, don’t forget na I love youuu, no matter what mangyari. I know medyo iba yung way of my greetings kasi tulad nga ng sinabi mo, hindi ka materialistic. Pero I hope you know na kahit simple lang, sincere and galing talaga sa puso ko.',
  'Happy birthday again, baobao! I love youuu.',
];
const SLICE_MIN_DISTANCE = 0.28;
const SWIPE_START_THRESHOLD = 8;
const SLICE_HIT_PADDING = 40;
const SLICE_FALLBACK_DELAY = 3000;

const screens = [...document.querySelectorAll('.screen')];
const music = document.getElementById('backgroundMusic');
music.src = MUSIC_FILE;
music.loop = true;
music.volume = 0.6;

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle('is-hidden', screen.dataset.screen !== name));
  if (name === 'celebration') launchConfetti();
  if (name === 'cake') {
    clearTimeout(fallbackTimer);
    sliceFallback.classList.add('is-hidden');
    fallbackTimer = setTimeout(showSliceFallback, SLICE_FALLBACK_DELAY);
  }
}

document.querySelectorAll('[data-next]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.next));
});

const introStage = document.getElementById('curtainStage');
let introStarted = false;

function initIntro() {
  introStage.classList.remove('open');
}

function playIntro() {
  if (introStarted) return;
  introStarted = true;
  introStage.classList.add('opening');
  requestAnimationFrame(() => introStage.classList.add('open'));
  setTimeout(startCountdown, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 450 : 2000);
}

function handleIntroTap() {
  playIntro();
}

document.getElementById('openCurtains').addEventListener('click', handleIntroTap);
initIntro();

function startCountdown() {
  showScreen('countdown');
  const number = document.getElementById('countdownNumber');
  const dots = [...document.querySelectorAll('#countdownDots span')];
  let value = 3;
  const tick = () => {
    number.textContent = value;
    number.style.animation = 'none';
    void number.offsetWidth;
    number.style.animation = 'pop .7s ease';
    dots.forEach((dot, index) => dot.classList.toggle('active', index >= 3 - value));
    if (value === 0) {
      showScreen('loading');
      setTimeout(() => showScreen('party'), 2300);
      return;
    }
    value -= 1;
    setTimeout(tick, 850);
  };
  tick();
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cakeArea = document.getElementById('cakeArea');
const knifeTrail = document.getElementById('knifeTrail');
const sliceGuide = document.getElementById('sliceGuide');
const gestureStatus = document.getElementById('gestureStatus');
const sliceFallback = document.getElementById('sliceFallback');
let pointerState = null;
let trailFrame = 0;
let pendingPoint = null;
let sliceComplete = false;
let fallbackTimer;

function pointInCake(point) {
  const bounds = cakeArea.getBoundingClientRect();
  return point.x >= bounds.left - SLICE_HIT_PADDING && point.x <= bounds.right + SLICE_HIT_PADDING
    && point.y >= bounds.top - SLICE_HIT_PADDING && point.y <= bounds.bottom + SLICE_HIT_PADDING;
}

function updateKnifeTrail() {
  trailFrame = 0;
  if (!pendingPoint || !pointerState) return;
  const bounds = cakeArea.getBoundingClientRect();
  knifeTrail.style.left = `${pointerState.start.x - bounds.left}px`;
  knifeTrail.style.top = `${pointerState.start.y - bounds.top}px`;
  const deltaX = pendingPoint.x - pointerState.start.x;
  const deltaY = pendingPoint.y - pointerState.start.y;
  knifeTrail.style.width = `${Math.hypot(deltaX, deltaY)}px`;
  knifeTrail.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
}

function queueTrail(point) {
  pendingPoint = point;
  if (!trailFrame) trailFrame = requestAnimationFrame(updateKnifeTrail);
}

function resetSliceGesture() {
  pointerState = null;
  pendingPoint = null;
  knifeTrail.classList.remove('visible');
  cakeArea.classList.remove('gesture-reset');
  void cakeArea.offsetWidth;
  cakeArea.classList.add('gesture-reset');
}

function getSwipeDistance(start, point) {
  return Math.hypot(point.x - start.x, point.y - start.y);
}

function triggerSlice(start, end) {
  if (sliceComplete) return;
  runSliceTimeline(start, end);
}

function autoCompleteSlice() {
  const bounds = cakeArea.getBoundingClientRect();
  triggerSlice(
    { x: bounds.left + bounds.width * .29, y: bounds.top + bounds.height * .74 },
    { x: bounds.left + bounds.width * .71, y: bounds.top + bounds.height * .28 }
  );
}

function showSliceFallback() {
  if (!sliceComplete) sliceFallback.classList.remove('is-hidden');
}

function beginSlice(event) {
  if (sliceComplete) return;
  event.preventDefault();
  cakeArea.setPointerCapture(event.pointerId);
  pointerState = { start: { x: event.clientX, y: event.clientY }, last: { x: event.clientX, y: event.clientY } };
  knifeTrail.classList.add('visible');
  sliceGuide.classList.add('is-hidden');
  sliceFallback.classList.add('is-hidden');
  gestureStatus.textContent = 'Keep slicing...';
}

function trackSlice(event) {
  if (!pointerState || sliceComplete) return;
  event.preventDefault();
  pointerState.last = { x: event.clientX, y: event.clientY };
  queueTrail(pointerState.last);
  const distance = getSwipeDistance(pointerState.start, pointerState.last);
  if (distance < SWIPE_START_THRESHOLD) return;
  pointerState.started = true;
  const progress = Math.min(distance / (cakeArea.clientWidth * SLICE_MIN_DISTANCE), 1);
  knifeTrail.style.setProperty('--trail-progress', progress);
  if (distance >= cakeArea.clientWidth * SLICE_MIN_DISTANCE && pointInCake(pointerState.last)) {
    triggerSlice(pointerState.start, pointerState.last);
  }
}

function detectSlice(event) {
  if (!pointerState || sliceComplete) return;
  const end = { x: event.clientX, y: event.clientY };
  const distance = getSwipeDistance(pointerState.start, end);
  if (distance >= cakeArea.clientWidth * SLICE_MIN_DISTANCE && pointInCake(end)) {
    triggerSlice(pointerState.start, end);
  } else if (distance >= cakeArea.clientWidth * SLICE_MIN_DISTANCE * .6) {
    triggerSlice(pointerState.start, end);
  } else if (distance < SWIPE_START_THRESHOLD) {
    autoCompleteSlice();
  } else {
    gestureStatus.textContent = 'Almost! Try a longer swipe across the cake.';
    resetSliceGesture();
  }
}

function sliceTiming(variable) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const amount = parseFloat(value);
  return value.endsWith('ms') ? amount : amount * 1000;
}

cakeArea.addEventListener('pointerdown', beginSlice);
cakeArea.addEventListener('pointermove', trackSlice);
cakeArea.addEventListener('pointerup', detectSlice);
cakeArea.addEventListener('pointercancel', resetSliceGesture);
sliceFallback.addEventListener('click', autoCompleteSlice);
document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !sliceComplete
    && !document.querySelector('[data-screen="cake"]').classList.contains('is-hidden')) {
    event.preventDefault();
    autoCompleteSlice();
  }
});

function runSliceTimeline(start, end) {
  sliceComplete = true;
  clearTimeout(fallbackTimer);
  sliceFallback.classList.add('is-hidden');
  pointerState = null;
  const cakeScreen = document.querySelector('[data-screen="cake"]');
  cakeScreen.classList.add('screen-shake');
  setTimeout(() => cakeScreen.classList.remove('screen-shake'), 320);
  document.documentElement.style.setProperty('--slice-angle', `${Math.atan2(end.y - start.y, end.x - start.x)}rad`);
  knifeTrail.classList.remove('visible');
  cakeArea.classList.add('is-cutting');
  gestureStatus.textContent = 'A perfect slice!';
  if (reducedMotion) {
    cakeArea.classList.add('cut-complete');
    setTimeout(finishSlice, 450);
    return;
  }
  setTimeout(() => cakeArea.classList.add('cut-complete'), sliceTiming('--slice-wedge-delay'));
  setTimeout(extinguishCandles, sliceTiming('--slice-candles-delay'));
  setTimeout(spawnSliceConfetti, sliceTiming('--slice-confetti-delay'));
  setTimeout(finishSlice, sliceTiming('--slice-finish'));
}

function extinguishCandles() {
  const flames = [...document.querySelectorAll('.cake-area .flame')];
  const smoke = document.getElementById('smokeWisps');
  smoke.classList.add('slice-fx-smoke-active');
  flames.forEach((flame, index) => {
    setTimeout(() => {
      flame.classList.add('slice-fx-flame-out');
      smoke.children[index]?.classList.add('slice-fx-smoke-on');
    }, index * sliceTiming('--slice-candles') / 3);
  });
}

function spawnSliceConfetti() {
  const layer = document.getElementById('sliceFxParticles');
  const colors = ['var(--primary)', 'var(--accent)', 'var(--light)', 'var(--dark)'];
  const particles = Array.from({ length: 48 }, (_, index) => {
    const particle = document.createElement('span');
    particle.className = 'slice-fx-particle';
    particle.style.setProperty('--particle-size', `${3 + (index % 4)}px`);
    particle.style.setProperty('--particle-color', colors[index % colors.length]);
    particle.style.setProperty('--particle-x', `${(Math.random() - .5) * 170}px`);
    particle.style.setProperty('--particle-y', `${35 + Math.random() * 110}px`);
    particle.style.setProperty('--particle-duration', `${.8 + Math.random() * .6}s`);
    layer.appendChild(particle);
    requestAnimationFrame(() => particle.classList.add('is-live'));
    setTimeout(() => particle.remove(), 1500);
    return particle;
  });
  setTimeout(() => particles.forEach((particle) => particle.remove()), 1600);
}

function finishSlice() {
  cakeArea.classList.add('celebrate-cut');
  gestureStatus.textContent = 'The celebration is ready!';
  document.querySelector('.celebration-content')?.classList.add('slice-fx-finish');
  showScreen('celebration');
}

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const context = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#2E7D32', '#4CAF50', '#A5D6A7', '#1B4332'];
  const pieces = Array.from({ length: 75 }, (_, index) => ({
    x: canvas.width / 2, y: canvas.height * .35, vx: (Math.random() - .5) * 10,
    vy: Math.random() * -9 - 2, size: 4 + Math.random() * 7, life: 100 + Math.random() * 70, color: colors[index % colors.length]
  }));
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((piece) => {
      piece.x += piece.vx; piece.y += piece.vy; piece.vy += .18; piece.life -= 1;
      context.fillStyle = piece.color; context.fillRect(piece.x, piece.y, piece.size, piece.size);
    });
    if (pieces.some((piece) => piece.life > 0)) requestAnimationFrame(draw);
  };
  draw();
}

document.getElementById('waxSeal').addEventListener('click', () => {
  showScreen('message');
  music.play().catch((error) => {
    console.warn('Birthday music could not start:', error);
  }).finally(() => document.getElementById('muteButton').classList.remove('is-hidden'));
  typeLetter();
});

document.getElementById('muteButton').addEventListener('click', (event) => {
  music.muted = !music.muted;
  event.currentTarget.textContent = music.muted ? '×' : '♫';
  event.currentTarget.setAttribute('aria-label', music.muted ? 'Unmute music' : 'Mute music');
});

function typeLetter() {
  const full = document.querySelector('.letter-full');
  const visible = document.querySelector('.letter-visible');
  const text = LETTER.join('\n\n');
  full.textContent = text;
  visible.textContent = '';
  let index = 0;
  const type = () => {
    visible.textContent = text.slice(0, index);
    if (index < text.length) {
      index += 1;
      setTimeout(type, 22);
    } else {
      floatHearts();
    }
  };
  type();
}

function floatHearts() {
  ['♥', '✦', '♥', '✧'].forEach((symbol, index) => {
    const heart = document.createElement('span');
    heart.textContent = symbol;
    heart.className = 'floating-heart';
    heart.style.left = `${20 + index * 20}%`;
    heart.style.animationDelay = `${index * .25}s`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 3500);
  });
}
