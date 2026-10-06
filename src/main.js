/* ==========================================================================
   SONY WH-1000XM6 — FLAGSHIP ACOUSTIC EXPERIENCE
   Interactive Canvas Scrollytelling & Web Audio Architecture
   ========================================================================== */

// --- CONFIGURATION CONSTANTS ---
const TOTAL_FRAMES = 240;
const FRAME_PATH_PREFIX = '/sequence/ezgif-frame-';
const FRAME_EXTENSION = '.jpg';
const CANVAS_BG_COLOR = '#060606';

// State Machine
const state = {
  images: new Array(TOTAL_FRAMES + 1),
  imagesLoaded: 0,
  targetProgress: 0,
  currentProgress: 0,
  currentFrame: 1,
  isUserScrubbing: false,
  isLoaded: false,
  ancActive: false,
  currentEnv: 'cabin',
  audioCtx: null,
  ambientNode: null,
  filterNode: null,
  gainNode: null,
  analyserNode: null,
  animFrameId: null
};

// --- DOM ELEMENTS ---
const canvas = document.getElementById('product-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderPercent = document.getElementById('preloader-percent');
const preloaderStatusText = document.getElementById('preloader-status-text');

const navbar = document.getElementById('navbar');
const scrollySection = document.getElementById('experience');

// Story Beats
const beats = {
  hero: document.getElementById('beat-hero'),
  engineering: document.getElementById('beat-engineering'),
  anc: document.getElementById('beat-anc'),
  sound: document.getElementById('beat-sound'),
  cta: document.getElementById('beat-cta')
};

// Hotspots Layer
const hotspotsLayer = document.getElementById('hotspots-layer');

// HUD Elements
const hudPhaseLabel = document.getElementById('hud-phase-label');
const hudFrameCurrent = document.getElementById('hud-frame-current');
const frameRange = document.getElementById('frame-range');
const hudSliderFill = document.getElementById('hud-slider-fill');
const hudPillBtns = document.querySelectorAll('.hud-pill-btn');

// ANC Simulator Elements
const btnAncMaster = document.getElementById('toggle-anc-master');
const ancToggleState = document.getElementById('anc-toggle-state');
const ancToggleSub = document.getElementById('anc-toggle-sub');
const ancAttenuationDb = document.getElementById('anc-attenuation-db');
const visModeLabel = document.getElementById('vis-mode-label');
const visCanvas = document.getElementById('anc-canvas-vis');
const visCtx = visCanvas.getContext('2d');
const envButtons = document.querySelectorAll('.btn-env');
const navSoundBtn = document.getElementById('anc-simulator-btn');

// Finishes & Modal Elements
const finishSwatches = document.querySelectorAll('.finish-swatch');
const finishStatusBanner = document.getElementById('finish-status-banner');
const modalFinishLabel = document.getElementById('modal-finish-label');
const preorderModal = document.getElementById('preorder-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const preorderSubmitBtn = document.getElementById('preorder-submit-btn');
const reservationForm = document.getElementById('reservation-form');
const preorderFeedback = document.getElementById('preorder-feedback');
const heroScrollBtn = document.getElementById('hero-scroll-btn');

// --- HELPER: FRAME PATH GENERATOR ---
function getFrameUrl(index) {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_PATH_PREFIX}${padded}${FRAME_EXTENSION}`;
}

// --- 1. PRELOADER & IMAGE CACHE ---
function preloadImages() {
  let loadedCount = 0;
  const initialBatch = 20; // Critical initial frames

  function updateLoadingProgress() {
    const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    preloaderPercent.textContent = `${pct}%`;
    preloaderBar.style.width = `${pct}%`;

    if (loadedCount >= initialBatch && !state.isLoaded) {
      // First batch ready: draw initial frame and show experience
      renderFrame(1);
      preloaderStatusText.textContent = 'NEURAL ACOUSTIC ENGINE READY';
    }

    if (loadedCount >= TOTAL_FRAMES) {
      setTimeout(() => {
        preloader.classList.add('preloader-done');
        state.isLoaded = true;
      }, 300);
    }
  }

  // Load critical frames first, then remainder in background
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFrameUrl(i);
    img.onload = () => {
      state.images[i] = img;
      loadedCount++;
      state.imagesLoaded = loadedCount;
      updateLoadingProgress();
    };
    img.onerror = () => {
      // In case of network glitch, keep count moving
      loadedCount++;
      updateLoadingProgress();
    };
  }
}

// --- 2. CANVAS RENDERING ENGINE (SEAMLESS EDGE-FREE BLENDING) ---
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);
  renderFrame(state.currentFrame);
}

function renderFrame(frameIndex) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // 1. Fill unified seamless charcoal black background
  ctx.fillStyle = CANVAS_BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  const img = state.images[frameIndex];
  if (!img || !img.complete || img.naturalWidth === 0) {
    // Fallback: search closest loaded frame
    let fallback = null;
    for (let offset = 1; offset < 30; offset++) {
      if (state.images[frameIndex - offset]?.complete) {
        fallback = state.images[frameIndex - offset];
        break;
      }
      if (state.images[frameIndex + offset]?.complete) {
        fallback = state.images[frameIndex + offset];
        break;
      }
    }
    if (fallback) {
      drawImageContained(fallback, width, height);
    }
    return;
  }

  drawImageContained(img, width, height);

  // 2. Subtle edge feathering/vignette to guarantee zero perceptible JPEG boundaries
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, minDim * 0.32,
    width / 2, height / 2, maxDim * 0.65
  );
  vignette.addColorStop(0, 'rgba(6, 6, 6, 0)');
  vignette.addColorStop(0.65, 'rgba(6, 6, 6, 0.15)');
  vignette.addColorStop(1, 'rgba(6, 6, 6, 0.85)');

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawImageContained(img, canvasW, canvasH) {
  const imgW = img.naturalWidth || 1280;
  const imgH = img.naturalHeight || 720;
  const imgRatio = imgW / imgH;
  const canvasRatio = canvasW / canvasH;

  let renderW, renderH, offsetX, offsetY;

  // Scale to fit gracefully with generous breathing space
  const fitPadding = 0.94; // Apple-level edge negative space

  if (canvasRatio > imgRatio) {
    renderH = canvasH * fitPadding;
    renderW = renderH * imgRatio;
  } else {
    renderW = canvasW * fitPadding;
    renderH = renderW / imgRatio;
  }

  offsetX = (canvasW - renderW) / 2;
  offsetY = (canvasH - renderH) / 2;

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
}

// --- 3. SCROLL PROGRESS & FRAME MAPPING ---
// Frame progression rules:
// - 0.00 to 0.14: Fully assembled Hero shot (Frame 1)
// - 0.14 to 0.80: Smoothly disassembles/explodes from Frame 1 to Frame 240 (peak technical diagram)
// - 0.80 to 1.00: Reassembles gracefully from Frame 240 back to Frame 1!
function mapProgressToFrame(progress) {
  const p = Math.max(0, Math.min(1, progress));

  if (p <= 0.14) {
    return 1;
  } else if (p <= 0.80) {
    // Explode forwards: 1 -> 240
    const subProgress = (p - 0.14) / (0.80 - 0.14);
    // Smooth easeInOut curve for organic inertia
    const eased = subProgress < 0.5
      ? 2 * subProgress * subProgress
      : 1 - Math.pow(-2 * subProgress + 2, 2) / 2;
    const frame = Math.round(1 + eased * (TOTAL_FRAMES - 1));
    return Math.min(TOTAL_FRAMES, Math.max(1, frame));
  } else {
    // Reassemble backwards: 240 -> 1
    const subProgress = (p - 0.80) / (1.00 - 0.80);
    const eased = subProgress < 0.5
      ? 2 * subProgress * subProgress
      : 1 - Math.pow(-2 * subProgress + 2, 2) / 2;
    const frame = Math.round(TOTAL_FRAMES - eased * (TOTAL_FRAMES - 1));
    return Math.min(TOTAL_FRAMES, Math.max(1, frame));
  }
}

// Calculate scroll progress within the 450vh container
function updateScrollProgress() {
  if (state.isUserScrubbing) return;

  const rect = scrollySection.getBoundingClientRect();
  const totalScroll = scrollySection.offsetHeight - window.innerHeight;

  if (totalScroll <= 0) return;

  const currentScroll = -rect.top;
  const progress = Math.max(0, Math.min(1, currentScroll / totalScroll));
  state.targetProgress = progress;

  // Toggle Navbar Glassmorphism after 60px of page scroll
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

// --- 4. ANIMATION LOOP WITH SILKY LERP (60fps / 120fps) ---
function animationLoop() {
  // Lerp towards targetProgress (smooth dampening for trackpads / wheels)
  const lerpFactor = state.isUserScrubbing ? 0.35 : 0.12;
  state.currentProgress += (state.targetProgress - state.currentProgress) * lerpFactor;

  const computedFrame = mapProgressToFrame(state.currentProgress);

  if (computedFrame !== state.currentFrame) {
    state.currentFrame = computedFrame;
    renderFrame(state.currentFrame);
    updateHUD(state.currentProgress, state.currentFrame);
  }

  updateStoryBeats(state.currentProgress);
  updateHotspots(state.currentProgress);

  requestAnimationFrame(animationLoop);
}

// --- 5. STORY BEATS SYNCHRONIZATION ---
function updateStoryBeats(p) {
  // Beat 1: Hero (0% - 14%)
  toggleBeat(beats.hero, p >= 0 && p < 0.16);

  // Beat 2: Engineering Reveal (18% - 38%)
  toggleBeat(beats.engineering, p >= 0.18 && p < 0.40);

  // Beat 3: Noise Cancelling & Microphones (42% - 63%)
  toggleBeat(beats.anc, p >= 0.42 && p < 0.64);

  // Beat 4: Sound & Upscaling (66% - 84%)
  toggleBeat(beats.sound, p >= 0.66 && p < 0.85);

  // Beat 5: Reassembly & Final CTA (86% - 100%)
  toggleBeat(beats.cta, p >= 0.86);

  // Update navbar active link
  updateNavLinks(p);
}

function toggleBeat(element, shouldBeActive) {
  if (!element) return;
  if (shouldBeActive) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
}

function updateNavLinks(p) {
  const links = document.querySelectorAll('.nav-link[data-target]');
  links.forEach(link => {
    const target = parseFloat(link.getAttribute('data-target'));
    const isNearby = Math.abs(p - target) < 0.15;
    if (isNearby) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// --- 6. DYNAMIC COMPONENT HOTSPOTS ---
// Hotspots are prominent in peak exploded state (scroll 0.45 to 0.82)
function updateHotspots(p) {
  if (!hotspotsLayer) return;
  const shouldShow = p >= 0.46 && p <= 0.82;
  hotspotsLayer.style.opacity = shouldShow ? '1' : '0';
  hotspotsLayer.style.pointerEvents = shouldShow ? 'auto' : 'none';
}

// --- 7. HUD SCRUBBER CONTROLLER ---
function updateHUD(progress, frame) {
  if (hudFrameCurrent) {
    hudFrameCurrent.textContent = `FRAME ${String(frame).padStart(3, '0')}`;
  }

  if (hudSliderFill) {
    hudSliderFill.style.width = `${(progress * 100).toFixed(1)}%`;
  }

  if (frameRange && !state.isUserScrubbing) {
    frameRange.value = Math.round(progress * 1000);
  }

  // Update phase label
  let phase = 'PHASE 01: BEAUTY REVEAL';
  let activePillIndex = 0;

  if (progress > 0.84) {
    phase = 'PHASE 05: REASSEMBLED PRECISION';
    activePillIndex = 4;
  } else if (progress > 0.64) {
    phase = 'PHASE 04: AUDIOPHILE ACOUSTICS';
    activePillIndex = 3;
  } else if (progress > 0.40) {
    phase = 'PHASE 03: ADAPTIVE ANC ARRAY';
    activePillIndex = 2;
  } else if (progress > 0.16) {
    phase = 'PHASE 02: STRUCTURAL ENGINEERING';
    activePillIndex = 1;
  }

  if (hudPhaseLabel) {
    hudPhaseLabel.textContent = phase;
  }

  hudPillBtns.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === activePillIndex);
  });
}

// HUD Scrubber Events
if (frameRange) {
  frameRange.addEventListener('input', (e) => {
    state.isUserScrubbing = true;
    const progress = parseFloat(e.target.value) / 1000;
    state.targetProgress = progress;
  });

  frameRange.addEventListener('change', () => {
    state.isUserScrubbing = false;
  });
}

// HUD Pill Quick Navigation
hudPillBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const progress = parseFloat(btn.getAttribute('data-progress'));
    scrollToProgress(progress);
  });
});

function scrollToProgress(progress) {
  const totalScroll = scrollySection.offsetHeight - window.innerHeight;
  const targetScrollY = scrollySection.offsetTop + progress * totalScroll;
  window.scrollTo({
    top: targetScrollY,
    behavior: 'smooth'
  });
}

// --- 8. INTERACTIVE WEB AUDIO ANC SIMULATOR ---
function initAudioEngine() {
  if (state.audioCtx) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  state.audioCtx = new AudioCtx();

  // Create White/Pink Noise Buffer for realistic ambient roar
  const bufferSize = state.audioCtx.sampleRate * 2;
  const noiseBuffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filtering
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const whiteNoise = state.audioCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  // Ambient Environment Filter Node
  state.filterNode = state.audioCtx.createBiquadFilter();
  updateEnvFilter('cabin');

  // Master Gain Node
  state.gainNode = state.audioCtx.createGain();
  state.gainNode.gain.setValueAtTime(0.35, state.audioCtx.currentTime);

  // Analyser Node for visualizer
  state.analyserNode = state.audioCtx.createAnalyser();
  state.analyserNode.fftSize = 128;

  whiteNoise.connect(state.filterNode);
  state.filterNode.connect(state.gainNode);
  state.gainNode.connect(state.analyserNode);
  state.analyserNode.connect(state.audioCtx.destination);

  whiteNoise.start(0);
  startVisualizer();
}

function updateEnvFilter(env) {
  if (!state.filterNode || !state.audioCtx) return;

  const t = state.audioCtx.currentTime;
  if (env === 'cabin') {
    // Low rumble of jet turbofan
    state.filterNode.type = 'lowpass';
    state.filterNode.frequency.setTargetAtTime(180, t, 0.1);
    state.filterNode.Q.setTargetAtTime(3.5, t, 0.1);
  } else if (env === 'subway') {
    // Sub-bass rumble + metallic track screeches
    state.filterNode.type = 'bandpass';
    state.filterNode.frequency.setTargetAtTime(320, t, 0.1);
    state.filterNode.Q.setTargetAtTime(1.8, t, 0.1);
  } else if (env === 'city') {
    // Broad traffic and crowd murmur
    state.filterNode.type = 'lowpass';
    state.filterNode.frequency.setTargetAtTime(650, t, 0.1);
    state.filterNode.Q.setTargetAtTime(1.0, t, 0.1);
  }
}

function toggleMasterAnc() {
  initAudioEngine();
  state.ancActive = !state.ancActive;

  const t = state.audioCtx.currentTime;

  if (state.ancActive) {
    // ANC ON: Aggressive 38dB attenuation + tight high-cut silence
    state.gainNode.gain.setTargetAtTime(0.012, t, 0.08); // Near-total silence
    btnAncMaster.classList.add('anc-active');
    btnAncMaster.setAttribute('aria-pressed', 'true');
    ancToggleState.textContent = 'ACTIVE NOISE CANCELLING (ON)';
    ancToggleState.className = 'state-on';
    ancToggleSub.textContent = 'Inverse acoustic phase canceling external roar';
    ancAttenuationDb.textContent = '-38.4 dB';
    visModeLabel.textContent = 'ATTENUATED INVERSE SPECTRUM (ACTIVE QN2 SHIELD)';
    navSoundBtn.classList.add('sound-active');
  } else {
    // ANC OFF: Ambient roar
    state.gainNode.gain.setTargetAtTime(0.38, t, 0.08);
    btnAncMaster.classList.remove('anc-active');
    btnAncMaster.setAttribute('aria-pressed', 'false');
    ancToggleState.textContent = 'PASSIVE AMBIENT (ANC OFF)';
    ancToggleState.className = 'state-off';
    ancToggleSub.textContent = 'Full external ambient noise reaches the ear';
    ancAttenuationDb.textContent = '0.0 dB';
    visModeLabel.textContent = 'ENVIRONMENTAL AMBIENT SPECTRUM (RAW NOISE)';
  }
}

// Audio Spectrum Visualizer
function startVisualizer() {
  const bufferLength = state.analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);

    const w = visCanvas.width = visCanvas.offsetWidth;
    const h = visCanvas.height = visCanvas.offsetHeight;

    state.analyserNode.getByteFrequencyData(dataArray);

    visCtx.fillStyle = '#040406';
    visCtx.fillRect(0, 0, w, h);

    const barWidth = (w / bufferLength) * 1.8;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * (h * 0.85);

      // Gradient color: Electric Cyan to Deep Sony Blue
      const grad = visCtx.createLinearGradient(0, h, 0, h - barHeight);
      if (state.ancActive) {
        grad.addColorStop(0, 'rgba(0, 80, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 214, 255, 0.4)');
      } else {
        grad.addColorStop(0, 'rgba(0, 80, 255, 0.6)');
        grad.addColorStop(1, 'rgba(0, 214, 255, 0.95)');
      }

      visCtx.fillStyle = grad;
      visCtx.fillRect(x, h - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }
  }

  draw();
}

// Environment Button Listeners
envButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    initAudioEngine();
    envButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const env = btn.getAttribute('data-env');
    state.currentEnv = env;
    updateEnvFilter(env);
  });
});

if (btnAncMaster) {
  btnAncMaster.addEventListener('click', toggleMasterAnc);
}

if (navSoundBtn) {
  navSoundBtn.addEventListener('click', () => {
    toggleMasterAnc();
    // Smooth scroll down to ANC demo section if not already there
    const demoSec = document.getElementById('anc-demo');
    if (demoSec) {
      demoSec.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// --- 9. FINISHES & SWATCH SELECTOR ---
const finishDetails = {
  black: 'SELECTED: <strong>Matte Carbon Black</strong> — Pure stealth aesthetic with copper logo accents.',
  silver: 'SELECTED: <strong>Platinum Silver</strong> — Refined metallic luminescence with sandblasted anodized band.',
  navy: 'SELECTED: <strong>Midnight Obsidian</strong> — Deep nocturnal blue-black reflecting subtle ambient light.'
};

finishSwatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    finishSwatches.forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    const finish = swatch.getAttribute('data-finish');
    if (finishStatusBanner && finishDetails[finish]) {
      finishStatusBanner.innerHTML = `<span>${finishDetails[finish]}</span>`;
    }
    if (modalFinishLabel) {
      modalFinishLabel.textContent = swatch.getAttribute('title');
    }
  });
});

// --- 10. PRE-ORDER MODAL & INTERACTION ---
if (preorderSubmitBtn) {
  preorderSubmitBtn.addEventListener('click', () => {
    preorderModal.classList.remove('hidden');
  });
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    preorderModal.classList.add('hidden');
  });
}

if (preorderModal) {
  preorderModal.addEventListener('click', (e) => {
    if (e.target === preorderModal || e.target.classList.contains('modal-backdrop')) {
      preorderModal.classList.add('hidden');
    }
  });
}

if (reservationForm) {
  reservationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    preorderModal.classList.add('hidden');
    if (preorderFeedback) {
      preorderFeedback.classList.remove('hidden');
      preorderSubmitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#00D6A2" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Reserved Successfully</span>
      `;
      preorderSubmitBtn.style.borderColor = '#00D6A2';
    }
  });
}

// Hero Explore Button Click
if (heroScrollBtn) {
  heroScrollBtn.addEventListener('click', () => {
    scrollToProgress(0.25);
  });
}

// Navbar smooth scrolling to anchor points
document.querySelectorAll('.nav-link[data-target]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = parseFloat(link.getAttribute('data-target'));
    scrollToProgress(target);
  });
});

// --- 11. INITIALIZATION LIFECYCLE ---
window.addEventListener('resize', () => {
  resizeCanvas();
});

window.addEventListener('scroll', () => {
  updateScrollProgress();
}, { passive: true });

// Start sequence preloader and canvas setup
window.addEventListener('DOMContentLoaded', () => {
  preloadImages();
  resizeCanvas();
  updateScrollProgress();
  animationLoop();
});
