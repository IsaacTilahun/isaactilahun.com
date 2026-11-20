// Bit Flip
//
// Eight switches, worth 128, 64, 32, 16, 8, 4, 2 and 1. Flip them on until
// they add up to the target number. Every solve scores a point and deals a new
// target with the switches cleared. You have 60 seconds; the score is how many
// you solved (higher is better).
//
// The round moves through these states:
//
//   playing ──bits add up──▶ solved ──(short pause)──▶ playing (new target) …
//      │
//      └──clock hits 0──▶ over ──(short pause)──▶ result
//
// The first few targets only need the small bits, so the idea clicks before
// the big numbers show up.

import { h, art, button, statBar, introScreen, resultScreen, sfx, flash, randInt, isTouchDevice, restartAnimation } from "./kit/index.js";

const ROUND_SECONDS = 60;
const LOW_TIME_SECONDS = 10;                         // the clock turns red and ticks from here
const PLACE_VALUES = [128, 64, 32, 16, 8, 4, 2, 1];  // left to right, like written binary
const SOLVED_PAUSE_MS = 260;                         // the solved bits glow green for this long
const TIME_UP_PAUSE_MS = 700;                        // a beat to see the final board
const CLOCK_CHECK_MS = 100;                          // often enough that the seconds never lag
const GOOD_RUN_SOLVED = 5;                           // from here, time-up is a finish, not a fail
const START_HINT = "Flip bits on until they add up.";

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play, extra: introExample() });

    function play() {
      ctx.reset();

      const bits = PLACE_VALUES.map(() => false);
      const best = ctx.getBest();
      const endsAt = performance.now() + ROUND_SECONDS * 1000;
      let state = "playing";
      let solved = 0;
      let target = nextTarget(solved, 0);
      let secondsShown = ROUND_SECONDS;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "solved", label: "Solved", value: 0 },
        { key: "time", label: "Time", value: `${ROUND_SECONDS}s` },
        { key: "best", label: "Best", value: best ?? "—" },
      ]);

      const targetLabel = h("span", { class: "bf-target__label" }, "Make");
      const targetNumber = h("span", { class: "bf-target__number" }, target);
      const check = art("check", "✓", { className: "bf-check" });
      const targetPanel = h("div", { class: "bf-target" }, targetLabel, targetNumber, check);

      const bitButtons = PLACE_VALUES.map(bitButton);
      const bitsGroup = h("div", { class: "bf-bits", role: "group", "aria-label": "Bits, from 128 down to 1" },
        h("div", { class: "bf-nibble" }, bitButtons.slice(0, 4).map((bit) => bit.el)),
        h("div", { class: "bf-nibble" }, bitButtons.slice(4).map((bit) => bit.el))
      );

      const valueLabel = h("span", { class: "bf-value__label" }, "Now");
      const valueNumber = h("span", { class: "bf-value__number" }, "0");
      const value = h("div", { class: "bf-value" }, valueLabel, valueNumber);
      const sumLine = h("p", { class: "bf-sum" }, START_HINT);

      const clearButton = button("Clear", null, { variant: "ghost", className: "bf-clear", "aria-label": "Clear all bits" });
      const keyHint = isTouchDevice() ? null : h("p", { class: "bf-hint" }, "Keys 1–8 flip bits · 0 clears");
      const live = h("p", { class: "sr-only", role: "status", "aria-live": "polite" });

      const root = h("div", { class: "bf", tabindex: "-1" },
        stats.el,
        targetPanel,
        bitsGroup,
        h("div", { class: "bf-readout" }, value, sumLine),
        h("div", { class: "bf-actions" }, clearButton, keyHint),
        live
      );
      stage.replaceChildren(root);
      root.focus({ preventScroll: true });

      /* ----- Drawing the board ----- */

      function renderBits() {
        bitButtons.forEach(({ el, digit }, i) => {
          el.classList.toggle("is-on", bits[i]);
          el.setAttribute("aria-pressed", String(bits[i]));
          digit.textContent = bits[i] ? "1" : "0";
        });
      }

      function renderReadout() {
        const current = sumOf(bits);
        valueNumber.textContent = String(current);

        if (current > target) setValueState("over", "Too high");
        else if (current === target) setValueState("match", "Got it");
        else setValueState("", "Now");

        // Spell the sum out ("64 + 4 + 1 = 69") so the maths is visible while learning.
        const parts = PLACE_VALUES.filter((_, i) => bits[i]);
        if (parts.length === 0) sumLine.textContent = solved === 0 ? START_HINT : "";
        else if (parts.length === 1) sumLine.textContent = String(parts[0]);
        else sumLine.textContent = `${parts.join(" + ")} = ${current}`;
      }

      function setValueState(name, text) {
        value.dataset.state = name;
        valueLabel.textContent = text;
      }

      function render() {
        renderBits();
        renderReadout();
      }

      function say(text) {
        live.textContent = text;
      }

      /* ----- Rules ----- */

      function toggleBit(index) {
        if (state !== "playing") return;
        bits[index] = !bits[index];
        restartAnimation(bitButtons[index].el, "is-flipping");
        sfx.tick();
        render();
        if (sumOf(bits) === target) solve();
      }

      function clearBits() {
        if (state !== "playing" || !bits.some(Boolean)) return;
        bitButtons.forEach(({ el }, i) => {
          if (bits[i]) restartAnimation(el, "is-flipping");
        });
        bits.fill(false);
        sfx.tick();
        render();
      }

      function solve() {
        state = "solved";
        solved++;
        stats.set("solved", solved);
        sfx.good();
        flash(targetPanel, "good");
        bitsGroup.dataset.state = "solved";
        restartAnimation(check, "is-shown");
        ctx.timeout(dealNextTarget, SOLVED_PAUSE_MS);
      }

      function dealNextTarget() {
        if (state !== "solved") return; // the clock may have run out during the pause
        state = "playing";
        bitsGroup.dataset.state = "";
        bits.fill(false);
        target = nextTarget(solved, target);
        targetNumber.textContent = String(target);
        restartAnimation(targetNumber, "is-new");
        render();
        say(`Solved. Next: ${target}.`);
      }

      function tickClock() {
        if (state === "over") return;
        const msLeft = Math.max(0, endsAt - performance.now());
        const seconds = Math.ceil(msLeft / 1000);

        if (seconds !== secondsShown) {
          secondsShown = seconds;
          showSeconds(seconds);
        }
        if (msLeft === 0) timeUp();
      }

      // Quiet most of the time; the last ten seconds go red, bump and tick.
      function showSeconds(seconds) {
        const lowTime = seconds <= LOW_TIME_SECONDS;
        stats.set("time", `${seconds}s`, { bump: lowTime });
        if (!lowTime) return;

        root.dataset.clock = "low";
        if (seconds > 0) sfx.tick();
        if (seconds === LOW_TIME_SECONDS) say(`${LOW_TIME_SECONDS} seconds left.`);
      }

      function timeUp() {
        state = "over";
        root.classList.add("is-over");
        targetLabel.textContent = "Time's up";

        // A good run ends on a high note, not a buzzer.
        const goodRun = solved >= GOOD_RUN_SOLVED || (best != null && solved > best);
        if (goodRun) {
          sfx.good();
          flash(targetPanel, "good");
          say(`Time. ${solved} solved, nice run.`);
        } else {
          sfx.bad();
          say(`Time. ${solved} solved.`);
        }

        ctx.timeout(showResult, TIME_UP_PAUSE_MS);
      }

      function showResult() {
        resultScreen(ctx, {
          score: solved,
          display: String(solved),
          caption: solved === 1 ? "number solved" : "numbers solved",
          message: verdict(solved),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      // click (not pointerdown) so Enter/Space on a focused bit works too;
      // touch-action: manipulation in the CSS keeps taps instant on phones.
      bitButtons.forEach((bit, index) => ctx.on(bit.el, "click", () => toggleBit(index)));
      ctx.on(clearButton, "click", clearBits);

      ctx.on(document, "keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

        if (/^[1-8]$/.test(event.key)) {
          event.preventDefault();
          toggleBit(Number(event.key) - 1);
        } else if (event.key === "0" || event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          clearBits();
        }
      });

      ctx.interval(tickClock, CLOCK_CHECK_MS);
      render();
      say(`Make ${target}. ${ROUND_SECONDS} seconds.`);
    }
  },
};

/** One switch: its place value on top, its 0/1 digit below. */
function bitButton(place) {
  const digit = h("span", { class: "bf-bit__digit" }, "0");
  const el = h("button", { type: "button", class: "bf-bit", "aria-pressed": "false", "aria-label": `Bit ${place}` },
    h("span", { class: "bf-bit__place", "aria-hidden": "true" }, place),
    digit
  );
  return { el, digit };
}

/** The number the switches currently make. */
function sumOf(bits) {
  return PLACE_VALUES.reduce((sum, place, i) => (bits[i] ? sum + place : sum), 0);
}

/** Targets grow with the score: 4 bits, then 5, 6, 7, and finally all 8. */
function largestTargetFor(solved) {
  if (solved < 2) return 15;
  if (solved < 4) return 31;
  if (solved < 6) return 63;
  if (solved < 8) return 127;
  return 255;
}

/** A fresh target, never the same as the last one. */
function nextTarget(solved, previous) {
  const largest = largestTargetFor(solved);
  let target = previous;
  while (target === previous) target = randInt(1, largest);
  return target;
}

function verdict(solved) {
  if (solved === 0) return "Tip: start with the biggest bit that still fits.";
  if (solved < 5) return "Warming up. Biggest bit first is the trick.";
  if (solved < 10) return "Nice. You're thinking in binary now.";
  if (solved < 15) return "Fast fingers, faster bits.";
  if (solved < 20) return "Seriously quick. Compiler-grade.";
  return "Binary native. Impressive.";
}

/** A tiny worked example for the intro screen: 00000101 = 4 + 1 = 5. */
function introExample() {
  const lit = new Set([4, 1]);
  return h("div", { class: "bf-example", role: "img", "aria-label": "Example: the 4 bit and the 1 bit are on, so the number is 5." },
    h("div", { class: "bf-example__bits", "aria-hidden": "true" },
      PLACE_VALUES.map((place) =>
        h("span", { class: lit.has(place) ? "bf-example__bit is-on" : "bf-example__bit" },
          h("span", { class: "bf-example__place" }, place),
          h("span", { class: "bf-example__digit" }, lit.has(place) ? "1" : "0")
        )
      )
    ),
    h("p", { class: "bf-example__sum", "aria-hidden": "true" }, "4 + 1 = 5")
  );
}
