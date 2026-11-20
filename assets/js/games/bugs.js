// Squash the Bug
//
// An aim trainer. One bug at a time appears somewhere in the play area; squash
// it and the next one turns up somewhere else. The first bug waits in the
// middle, and squashing it starts the clock. After 30 bugs the score is the
// average time per bug (lower is better). Missed taps don't stop the clock,
// but they count against your accuracy.
//
//   ready ──squash──▶ hunting ──squash──▶ hunting … ──30th squash──▶ done ──▶ result
//                        │
//                        └──tap empty ground──▶ miss mark (still hunting)
//
// Pointer only, on purpose: aiming is the whole game. A key that squashes the
// bug wherever it is would turn it into an Enter-mashing contest and fill the
// best score with impossible times.

import { h, art, statBar, introScreen, resultScreen, sfx, randInt } from "./kit/index.js";

const BUGS = 30;
const EDGE_GAP_PX = 8;          // room between a bug's hit area and the border
const MIN_JUMP_PX = 110;        // a new bug never lands this close to the last one
const SPOT_TRIES = 24;          // random picks before settling for the farthest one
const MAX_TILT_DEG = 35;
const POP_IN_MS = 120;
const SPLAT_MS = 700;
const MISS_MARK_MS = 450;
const FINISH_PAUSE_MS = 500;    // let the last splat land before the result

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      const times = [];                 // ms each bug survived, in order
      let state = "ready";
      let taps = 0;                     // every tap once the clock runs: hits and misses
      let shownAt = 0;                  // when the current bug appeared
      let lastSpot = { x: 0, y: 0 };    // where the current bug sits, in px

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "left", label: "Left", value: BUGS },
        { key: "average", label: "Average", value: "—" },
      ]);
      // Not in the tab order: it can only be hit by aiming at it (see the header).
      const bug = h("button", { type: "button", class: "bg-bug", tabindex: "-1", "aria-label": "Bug" });
      const startHint = h("span", { class: "bg-start", "aria-hidden": "true" }, "Squash to start");
      const field = h("div", { class: "bg-field" }, bug, startHint);
      const live = h("p", { class: "sr-only", "aria-live": "polite" }, "Squash the bug in the middle to start.");
      stage.replaceChildren(h("div", { class: "bg" }, stats.el, field, live));

      setState("ready");
      putBugAt(field.clientWidth / 2, field.clientHeight / 2);

      /* ----- Bugs coming and going ----- */

      // Bugs are placed in px but stored as percentages, so a phone rotating
      // mid-round keeps them inside the field.
      function putBugAt(x, y) {
        lastSpot = { x, y };
        bug.style.left = `${(x / field.clientWidth) * 100}%`;
        bug.style.top = `${(y / field.clientHeight) * 100}%`;

        const tilt = randInt(-MAX_TILT_DEG, MAX_TILT_DEG);
        bug.replaceChildren(art("bug", "ж", { className: "bg-bug__art", rotate: tilt }));

        if (!ctx.reducedMotion) {
          bug.animate([{ scale: "0.6", opacity: 0.2 }, { scale: "1", opacity: 1 }], { duration: POP_IN_MS, easing: "ease-out" });
        }
      }

      function spawnBug() {
        const margin = bug.offsetWidth / 2 + EDGE_GAP_PX;
        const spot = randomSpot(field.clientWidth, field.clientHeight, margin, lastSpot, MIN_JUMP_PX);
        putBugAt(spot.x, spot.y);
        shownAt = performance.now();
      }

      // A splat stays behind for a moment where the bug was.
      function leaveSplat() {
        const splat = h("span", {
          class: "bg-splat",
          style: { left: bug.style.left, top: bug.style.top, animationDuration: `${SPLAT_MS}ms` },
        }, art("splat", "✱", { rotate: randInt(0, 359) }));
        field.append(splat);
        ctx.timeout(() => splat.remove(), SPLAT_MS);
      }

      function leaveMissMark(x, y) {
        const mark = h("span", {
          class: "bg-miss",
          style: { left: `${x}px`, top: `${y}px`, animationDuration: `${MISS_MARK_MS}ms` },
        });
        field.append(mark);
        ctx.timeout(() => mark.remove(), MISS_MARK_MS);
      }

      /* ----- Rules ----- */

      function setState(next) {
        state = next;
        field.dataset.state = next;
      }

      function startHunt() {
        setState("hunting");
        startHint.remove();
        live.textContent = `Go! ${BUGS} bugs.`;
        spawnBug();
      }

      // `tappedAt` is the tap's own timestamp, so the work done here isn't timed.
      function squash(tappedAt) {
        if (state === "done") return;

        leaveSplat();
        sfx.good();
        if (state === "ready") {
          startHunt();
          return;
        }

        taps += 1;
        times.push(tappedAt - shownAt);
        stats.set("left", BUGS - times.length);
        stats.set("average", `${average(times)} ms`, { bump: false });

        if (times.length === BUGS) {
          finish();
          return;
        }
        spawnBug();
      }

      function miss(x, y) {
        if (state !== "hunting") return;
        taps += 1;
        sfx.bad();
        leaveMissMark(x, y);
      }

      function finish() {
        setState("done");
        bug.hidden = true;
        live.textContent = "All squashed.";

        const score = average(times);
        ctx.timeout(() => {
          resultScreen(ctx, {
            score,
            display: `${score} ms`,
            caption: "average per bug",
            message: `${verdict(score)} ${accuracyNote(BUGS, taps)}`,
            onAgain: play,
          });
        }, FINISH_PAUSE_MS);
      }

      /* ----- Input ----- */

      // One listener for the whole field: a tap either lands on the bug or it
      // doesn't. pointerdown, not click, so the finger lifting isn't timed.
      ctx.on(field, "pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();

        if (event.target.closest(".bg-bug")) {
          squash(event.timeStamp);
          return;
        }
        const box = field.getBoundingClientRect();
        miss(event.clientX - box.left - field.clientLeft, event.clientY - box.top - field.clientTop);
      });
    }
  },
};

/**
 * A random point at least `margin` from every edge and, when the field allows
 * it, at least `minDistance` from `avoid`. A small field can't always honour
 * the gap, so after a few tries it settles for the farthest point it found.
 */
function randomSpot(width, height, margin, avoid, minDistance) {
  let farthest = null;
  let farthestDistance = -1;

  for (let attempt = 0; attempt < SPOT_TRIES; attempt++) {
    const point = {
      x: randInt(Math.ceil(margin), Math.floor(width - margin)),
      y: randInt(Math.ceil(margin), Math.floor(height - margin)),
    };
    const distance = Math.hypot(point.x - avoid.x, point.y - avoid.y);
    if (distance >= minDistance) return point;
    if (distance > farthestDistance) {
      farthest = point;
      farthestDistance = distance;
    }
  }
  return farthest;
}

function average(list) {
  return Math.round(list.reduce((sum, value) => sum + value, 0) / list.length);
}

function accuracyNote(hits, taps) {
  const misses = taps - hits;
  if (misses === 0) return "Not a single miss.";
  const percent = Math.round((hits / taps) * 100);
  return `${percent}% accuracy, ${misses} ${misses === 1 ? "miss" : "misses"}.`;
}

function verdict(ms) {
  if (ms < 400) return "Unreal aim.";
  if (ms < 480) return "Sharp shooter.";
  if (ms < 580) return "Steady hands.";
  if (ms < 720) return "Not bad at all.";
  return "The bugs got comfy. Go again?";
}
