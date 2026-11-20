// Colour Memory
//
// A colour fills the screen for three seconds. Then it's gone, and the player
// has to find it again on a colour picker: drag around the square for
// saturation and brightness, slide the strip for hue, then lock it in.
// Each round scores 0–100 by how close the pick looks to the eye; five rounds,
// and the final score is the average (higher is better).
//
// Each round moves through three phases:
//
//   memorise ──(3 seconds)──▶ pick ──Lock it in──▶ reveal ──Next──▶ memorise …
//                                                     │
//                                                     └──(after round 5)──▶ result
//
// "How close" is measured in CIELAB with the CIEDE2000 formula, which is built
// to match how people see colour differences (RGB distance isn't: a small step
// in green looks nothing like the same step in blue).

import { h, statBar, countdownBar, introScreen, resultScreen, button, sfx, flash, clamp, focusSoon } from "./kit/index.js";

const ROUNDS = 5;
const SHOW_MS = 3000;

// Targets stay out of the washed-out and near-black corners, where every
// colour looks the same and the round becomes a coin toss.
const MIN_SATURATION = 0.35;
const MIN_BRIGHTNESS = 0.35;

// The picker starts on a dull grey with the hue spun to the opposite side, so
// the starting point never gives the answer away.
const START_SATURATION = 0.1;
const START_BRIGHTNESS = 0.55;

// Arrow keys nudge the picker by these steps; Shift moves five times further.
const KEY_STEP = 0.01;
const KEY_STEP_HUE_DEG = 2;
const SHIFT_MULTIPLIER = 5;

// Scoring: differences under 1 are invisible, so they count as perfect; at 40
// the colours are clearly different and the round scores zero.
const INVISIBLE_DELTA_E = 1;
const ZERO_SCORE_DELTA_E = 40;

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      const scores = [];
      let phase = "memorise";
      let target = null;
      let picker = null;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "round", label: "Round", value: `1/${ROUNDS}` },
        { key: "average", label: "Average", value: "—" },
      ]);
      const prompt = h("p", { class: "cm-prompt" });
      const panel = h("div", { class: "cm-panel" });
      const status = h("p", { class: "sr-only", "aria-live": "polite" });
      stage.replaceChildren(h("div", { class: "cm" }, stats.el, prompt, panel, status));

      // Each phase swaps what's in the panel; the prompt above it says what to do.
      function showPhase(nextPhase, promptText, ...children) {
        phase = nextPhase;
        panel.dataset.phase = nextPhase;
        prompt.textContent = promptText;
        panel.replaceChildren(...children);
      }

      /* ----- Phases ----- */

      function startRound() {
        target = randomTarget();
        stats.set("round", `${scores.length + 1}/${ROUNDS}`);
        status.textContent = `Round ${scores.length + 1}. Memorise the colour.`;

        showPhase("memorise", "Memorise",
          h("div", { class: "cm-swatch cm-swatch--target", role: "img", "aria-label": "The colour to memorise", style: { background: toCss(target) } }),
          countdownBar(SHOW_MS)
        );
        ctx.timeout(startPicking, SHOW_MS);
      }

      function startPicking() {
        picker = buildPicker(ctx, startingColourFor(target));
        status.textContent = "Find the colour, then lock it in.";

        showPhase("pick", "Now find it",
          picker.el,
          h("div", { class: "cm-actions" },
            picker.preview,
            button("Lock it in", lockIn, { className: "g-btn--big cm-lock" })
          )
        );
        focusSoon(picker.square);
      }

      function lockIn() {
        if (phase !== "pick") return; // a second tap or key press can't score the round twice

        const guess = picker.colour();
        const score = matchScore(target, guess);
        scores.push(score);
        stats.set("average", `${average(scores)}%`);

        const tier = scoreTier(score);
        const isLast = scores.length === ROUNDS;
        const scoreText = h("p", { class: "cm-score" }, `${score}%`);
        const yours = labelledSwatch(guess, "Yours");
        const next = button(isLast ? "See result" : "Next colour", nextRound, { className: "g-btn--big" });

        showPhase("reveal", tier.verdict,
          h("div", { class: "cm-compare" }, labelledSwatch(target, "Target").el, yours.el),
          scoreText,
          next
        );
        status.textContent = `${score}% match. ${tier.verdict}`;
        celebrate(tier, yours.swatch, scoreText);
        focusSoon(next);
      }

      function celebrate(tier, swatch, scoreText) {
        flash(scoreText, "pop");
        if (tier.close) flash(swatch, "good");
        sfx[tier.sound]();
      }

      function nextRound() {
        if (phase !== "reveal") return;
        if (scores.length < ROUNDS) {
          startRound();
          return;
        }

        const final = average(scores);
        resultScreen(ctx, {
          score: final,
          display: `${final}%`,
          caption: "average match",
          message: finalVerdict(final),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      // Enter does the obvious thing for the phase. preventDefault stops a
      // focused button from also clicking itself, which would skip a step.
      // Keys aimed at the card's own bar (like the back arrow) are left alone.
      ctx.on(document, "keydown", (event) => {
        if (event.key !== "Enter" || event.repeat) return;
        if (event.target !== document.body && !stage.contains(event.target)) return;

        if (phase === "pick") {
          event.preventDefault();
          lockIn();
        } else if (phase === "reveal") {
          event.preventDefault();
          nextRound();
        }
      });

      startRound();
    }
  },
};

/* ---------- The colour picker ---------- */

/**
 * A saturation/brightness square, a hue strip and a live preview swatch.
 * Works with mouse, touch and arrow keys. Colours are { h: 0–360, s: 0–1, v: 0–1 }.
 * Every listener goes through ctx, so the picker is torn down with the round.
 */
function buildPicker(ctx, start) {
  const colour = { ...start };

  const squareHandle = h("span", { class: "cm-handle" });
  const square = h("div", {
    class: "cm-square",
    tabindex: "0",
    role: "slider",
    "aria-roledescription": "2D slider",
    "aria-label": "Saturation and brightness",
    "aria-valuemin": "0",
    "aria-valuemax": "100",
  }, squareHandle);

  const hueHandle = h("span", { class: "cm-handle" });
  const hueStrip = h("div", {
    class: "cm-hue",
    tabindex: "0",
    role: "slider",
    "aria-label": "Hue",
    "aria-valuemin": "0",
    "aria-valuemax": "360",
  }, h("span", { class: "cm-hue__track" }), hueHandle);

  const preview = h("div", { class: "cm-swatch cm-swatch--preview", role: "img", "aria-label": "Your colour" });

  // One place turns the colour into pixels, so the handles, the preview and
  // the screen-reader values can never disagree.
  function render() {
    const css = toCss(colour);
    const pureHue = `hsl(${colour.h} 100% 50%)`;

    square.style.setProperty("--cm-hue", pureHue);
    squareHandle.style.left = `${colour.s * 100}%`;
    squareHandle.style.top = `${(1 - colour.v) * 100}%`;
    squareHandle.style.background = css;
    hueHandle.style.left = `${(colour.h / 360) * 100}%`;
    hueHandle.style.background = pureHue;
    preview.style.background = css;

    const saturation = Math.round(colour.s * 100);
    const brightness = Math.round(colour.v * 100);
    const degrees = Math.round(colour.h);
    square.setAttribute("aria-valuenow", String(saturation));
    square.setAttribute("aria-valuetext", `Saturation ${saturation}%, brightness ${brightness}%`);
    hueStrip.setAttribute("aria-valuenow", String(degrees));
    hueStrip.setAttribute("aria-valuetext", `${degrees} degrees`);
  }

  makeDraggable(ctx, square, (x, y) => {
    colour.s = x;
    colour.v = 1 - y;
    render();
  });
  makeDraggable(ctx, hueStrip, (x) => {
    colour.h = x * 360;
    render();
  });

  // Arrow keys: the square moves on both axes, the strip left and right
  // (up and down nudge it too, as screen-reader users expect of a slider).
  ctx.on(square, "keydown", (event) => {
    const step = event.shiftKey ? KEY_STEP * SHIFT_MULTIPLIER : KEY_STEP;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    colour.s = clamp(colour.s + move[0], 0, 1);
    colour.v = clamp(colour.v + move[1], 0, 1);
    render();
  });
  ctx.on(hueStrip, "keydown", (event) => {
    const step = event.shiftKey ? KEY_STEP_HUE_DEG * SHIFT_MULTIPLIER : KEY_STEP_HUE_DEG;
    const moves = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    colour.h = clamp(colour.h + move, 0, 360);
    render();
  });

  render();

  return {
    el: h("div", { class: "cm-picker" }, square, hueStrip),
    square,
    preview,
    colour: () => ({ ...colour }),
  };
}

/**
 * Press-and-drag on `el`, reporting where the pointer is as 0–1 on each axis
 * (clamped, so dragging past the edge pins to it). Mouse, touch and pen alike.
 */
function makeDraggable(ctx, el, onMove) {
  let dragPointer = null; // only the finger that started the drag moves the handle

  const moveTo = (event) => {
    const box = el.getBoundingClientRect();
    onMove(
      clamp((event.clientX - box.left) / box.width, 0, 1),
      clamp((event.clientY - box.top) / box.height, 0, 1)
    );
  };

  const stopDragging = (event) => {
    if (event.pointerId !== dragPointer) return;
    dragPointer = null;
    el.classList.remove("is-dragging");
  };

  ctx.on(el, "pointerdown", (event) => {
    if (event.button !== 0 || dragPointer !== null) return;
    event.preventDefault(); // no text selection or page scroll mid-drag
    el.focus({ preventScroll: true });
    dragPointer = event.pointerId;
    el.classList.add("is-dragging");
    // Capture keeps the drag going even when the finger slides off the edge.
    el.setPointerCapture(event.pointerId);
    moveTo(event);
  });
  ctx.on(el, "pointermove", (event) => {
    if (event.pointerId === dragPointer) moveTo(event);
  });
  ctx.on(el, "pointerup", stopDragging);
  ctx.on(el, "pointercancel", stopDragging);
  ctx.on(el, "lostpointercapture", stopDragging);
}

function labelledSwatch(colour, label) {
  const swatch = h("div", { class: "cm-swatch", role: "img", "aria-label": `${label} colour`, style: { background: toCss(colour) } });
  return { swatch, el: h("figure", { class: "cm-figure" }, swatch, h("figcaption", { class: "cm-caption" }, label)) };
}

/* ---------- Rounds and scoring ---------- */

const randomBetween = (min, max) => min + Math.random() * (max - min);

function randomTarget() {
  return {
    h: randomBetween(0, 360),
    s: randomBetween(MIN_SATURATION, 1),
    v: randomBetween(MIN_BRIGHTNESS, 1),
  };
}

function startingColourFor(target) {
  return { h: (target.h + 180) % 360, s: START_SATURATION, v: START_BRIGHTNESS };
}

/** 100 for a match the eye can't tell apart, falling to 0 for a clearly different colour. */
function matchScore(target, guess) {
  const difference = deltaE2000(toLab(target), toLab(guess));
  const closeness = 1 - (difference - INVISIBLE_DELTA_E) / (ZERO_SCORE_DELTA_E - INVISIBLE_DELTA_E);
  return Math.round(clamp(closeness, 0, 1) * 100);
}

const average = (list) => Math.round(list.reduce((sum, n) => sum + n, 0) / list.length);

/** What a round's score means: the words, the sound, and whether to celebrate. */
function scoreTier(score) {
  if (score >= 95) return { verdict: "Spot on!", sound: "great", close: true };
  if (score >= 85) return { verdict: "Very close.", sound: "great", close: true };
  if (score >= 70) return { verdict: "Close.", sound: "good", close: false };
  if (score >= 50) return { verdict: "In the neighbourhood.", sound: "tick", close: false };
  return { verdict: "Not quite.", sound: "bad", close: false };
}

function finalVerdict(score) {
  if (score >= 90) return "A painter's eye.";
  if (score >= 80) return "Your colour memory is sharp.";
  if (score >= 65) return "Pretty good. Colours are slippery.";
  if (score >= 45) return "Not bad. It gets easier with practice.";
  return "Colours are hard to hold on to. Go again?";
}

/* ---------- Colour maths ---------- */

/** HSV (hue 0–360, s and v 0–1) to sRGB channels 0–255. */
function hsvToRgb({ h: hue, s, v }) {
  const channel = (n) => {
    const k = (n + hue / 60) % 6;
    return v - v * s * clamp(Math.min(k, 4 - k), 0, 1);
  };
  return [channel(5), channel(3), channel(1)].map((c) => Math.round(c * 255));
}

function toCss(hsv) {
  const [r, g, b] = hsvToRgb(hsv);
  return `rgb(${r} ${g} ${b})`;
}

/** HSV to CIELAB, via linear sRGB and XYZ (D65 white, the sRGB standard). */
function toLab(hsv) {
  const [r, g, b] = hsvToRgb(hsv).map((c) => {
    const value = c / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; // undo gamma
  });

  // XYZ, each divided by the white point so white lands on (1, 1, 1).
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;

  // Lab's cube-root curve, with a straight-line segment near black.
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/**
 * CIEDE2000 colour difference between two Lab colours. Roughly: under 1 is
 * invisible, 2–10 is noticeable at a glance, 40+ is a different colour.
 * Follows Sharma, Wu & Dalal (2005); checked against their test pairs.
 */
function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const chromaWeight = (c) => Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7));

  // Stretch the a axis a little for greyish colours, where Lab underestimates differences.
  const G = 0.5 * (1 - chromaWeight((Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  // Chroma and hue angle of each colour.
  const C1 = Math.hypot(a1p, b1);
  const C2 = Math.hypot(a2p, b2);
  const h1 = hueAngle(a1p, b1);
  const h2 = hueAngle(a2p, b2);
  const bothChromatic = C1 * C2 !== 0;

  // Differences in lightness, chroma and hue, taking the short way round the hue circle.
  let dh = bothChromatic ? h2 - h1 : 0;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dL = L2 - L1;
  const dC = C2 - C1;
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin(rad(dh / 2));

  // Averages, which decide how much each difference counts.
  const L = (L1 + L2) / 2;
  const C = (C1 + C2) / 2;
  let H = h1 + h2;
  if (bothChromatic) {
    if (Math.abs(h1 - h2) <= 180) H /= 2;
    else H = (H < 360 ? H + 360 : H - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos(rad(H - 30))
    + 0.24 * Math.cos(rad(2 * H))
    + 0.32 * Math.cos(rad(3 * H + 6))
    - 0.2 * Math.cos(rad(4 * H - 63));
  const SL = 1 + (0.015 * (L - 50) ** 2) / Math.sqrt(20 + (L - 50) ** 2);
  const SC = 1 + 0.045 * C;
  const SH = 1 + 0.015 * C * T;
  // Blues need a correction: chroma and hue differences interact there.
  const RT = -2 * chromaWeight(C) * Math.sin(rad(60 * Math.exp(-(((H - 275) / 25) ** 2))));

  const lightness = dL / SL;
  const chroma = dC / SC;
  const hue = dH / SH;
  return Math.sqrt(lightness ** 2 + chroma ** 2 + hue ** 2 + RT * chroma * hue);
}

/** The angle of the point (a, b) in degrees, 0–360. */
function hueAngle(a, b) {
  if (a === 0 && b === 0) return 0;
  const degrees = (Math.atan2(b, a) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}
