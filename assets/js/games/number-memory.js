// Number Memory
//
// A number appears for a moment. The player memorises it, it disappears, and
// they type it back. Every level adds one digit, starting at two so the first
// round already asks something. One wrong answer ends the game, and the score
// is the longest number they got right (higher is better).
//
// Each level moves through these phases:
//
//   show ──(time's up)──▶ recall ──submit──▶ correct ──Next──▶ show (one digit longer) …
//                                    │
//                                    └──wrong──▶ wrong ──(short pause)──▶ result
//
// Longer numbers stay on screen longer: one second, plus a bit per digit.

import { h, art, button, statBar, countdownBar, introScreen, resultScreen, sfx, flash, focusSoon, randInt } from "./kit/index.js";

const START_DIGITS = 2;
const BASE_SHOW_MS = 1000;
const SHOW_MS_PER_DIGIT = 650;
const WRONG_PAUSE_MS = 700;   // a beat on the mistake before the result
const GROUP_SIZE = 3;         // digits are spaced in threes, like 4 815 162

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      let level = 1;
      let target = "";  // the number for this level, as a string of digits
      let longest = 0;  // digits in the longest number typed back correctly
      let phase = "show";

      /* ----- Build the round ----- */

      // Each phase has its own view, built once; the panel shows one at a time.
      const stats = statBar([
        { key: "level", label: "Level", value: level },
        { key: "digits", label: "Digits", value: START_DIGITS },
      ]);

      // Show: refilled every level with a new number and a fresh countdown.
      const showView = h("div", { class: "nm-view" });

      // Recall: a real form, so Enter on desktop and Done on a phone keyboard both submit.
      const input = h("input", {
        class: "nm-input",
        type: "text",
        inputmode: "numeric",
        pattern: "[0-9]*",
        autocomplete: "off",
        autocorrect: "off",
        spellcheck: "false",
        enterkeyhint: "done",
        "aria-label": "The number you saw",
      });
      const counter = h("p", { class: "nm-counter", "aria-hidden": "true" });
      const submit = button("Submit", null, { type: "submit", className: "g-btn--big" });
      const recallView = h("form", { class: "nm-view nm-form", autocomplete: "off" },
        h("p", { class: "nm-prompt" }, "What was the number?"),
        input,
        counter,
        submit
      );

      // Correct: a tick, the digit count, and a button to go on.
      const mark = art("check", "✓", { className: "nm-mark" });
      const detail = h("p", { class: "nm-detail" });
      const next = button("Next", null, { className: "g-btn--big" });
      const correctView = h("div", { class: "nm-view" },
        mark,
        h("p", { class: "nm-verdict" }, "Correct"),
        detail,
        next
      );

      const panel = h("div", { class: "nm-panel" });
      const live = h("p", { class: "sr-only", role: "status", "aria-live": "polite" });
      const root = h("div", { class: "nm" }, stats.el, panel, live);
      stage.replaceChildren(root);

      /* ----- Phases ----- */

      // The CSS keys off data-phase (the recall form sits higher on phones, the wrong field turns red).
      function setPhase(name) {
        phase = name;
        root.dataset.phase = name;
      }

      function showNumber() {
        const digits = START_DIGITS + level - 1;
        const viewMs = BASE_SHOW_MS + SHOW_MS_PER_DIGIT * digits;
        target = randomNumber(digits);

        setPhase("show");
        stats.set("level", level);
        stats.set("digits", digits);
        showView.replaceChildren(
          h("p", { class: "nm-prompt" }, "Remember this number."),
          numberView(target),
          countdownBar(viewMs)
        );
        panel.replaceChildren(showView);
        live.textContent = `Remember this number: ${spellOut(target)}`;

        ctx.timeout(askForNumber, viewMs);
      }

      function askForNumber() {
        setPhase("recall");
        input.value = "";
        input.style.setProperty("--nm-length", target.length);
        updateForm();
        panel.replaceChildren(recallView);
        live.textContent = `Type the ${target.length} digit number.`;
        focusSoon(input);
      }

      function updateForm() {
        counter.textContent = `${input.value.length} / ${target.length}`;
        submit.disabled = input.value === "";
      }

      function checkAnswer() {
        if (phase !== "recall" || input.value === "") return;
        if (input.value === target) numberRight();
        else numberWrong(input.value);
      }

      function numberRight() {
        setPhase("correct");
        longest = target.length;
        sfx.good();

        detail.textContent = `${target.length} digits`;
        panel.replaceChildren(correctView);
        live.textContent = `Correct, ${target.length} digits.`;
        flash(mark, "pop");
        focusSoon(next);
      }

      function numberWrong(typed) {
        setPhase("wrong");
        recallView.inert = true; // no second guesses while the mistake sinks in
        sfx.bad();
        flash(recallView, "bad");
        live.textContent = "Not quite.";

        ctx.timeout(() => {
          resultScreen(ctx, {
            score: longest,
            display: String(longest),
            caption: "digits",
            message: verdict(longest),
            extra: comparisonView(target, typed),
            onAgain: play,
          });
        }, WRONG_PAUSE_MS);
      }

      function nextLevel() {
        if (phase !== "correct") return;
        level += 1;
        showNumber();
      }

      /* ----- Input ----- */

      // Digits only, whatever the keyboard or a paste lets through, and never
      // longer than the number (the length isn't a secret; the counter shows it).
      ctx.on(input, "input", () => {
        const digits = input.value.replace(/\D/g, "").slice(0, target.length);
        if (digits !== input.value) input.value = digits;
        updateForm();
      });

      ctx.on(recallView, "submit", (event) => {
        event.preventDefault();
        checkAnswer();
      });

      // Enter on the Correct screen moves on even if the Next button has lost
      // focus. preventDefault stops a focused Next from also clicking.
      ctx.on(next, "click", nextLevel);
      ctx.on(document, "keydown", (event) => {
        if (event.key !== "Enter" || event.repeat || phase !== "correct") return;
        event.preventDefault();
        nextLevel();
      });

      showNumber();
    }
  },
};

/* ----- Helpers ----- */

/** A random number `digits` long, as a string, never starting with 0. */
function randomNumber(digits) {
  let number = String(randInt(1, 9));
  while (number.length < digits) number += randInt(0, 9);
  return number;
}

/**
 * Split a list (or string) into threes counted from the right, the way long
 * numbers are usually written: "1234567" -> ["1", "234", "567"].
 */
function groupFromRight(items) {
  const firstSize = items.length % GROUP_SIZE || GROUP_SIZE;
  const groups = [items.slice(0, firstSize)];
  for (let i = firstSize; i < items.length; i += GROUP_SIZE) {
    groups.push(items.slice(i, i + GROUP_SIZE));
  }
  return groups;
}

/** "4815" -> "4 8 1 5", so a screen reader reads digits, not "four thousand…". */
function spellOut(number) {
  return number.split("").join(" ");
}

/**
 * The big number to memorise. Groups of three wrap as whole groups, and the
 * CSS shrinks the font with the length (--nm-length) so it fits a phone.
 */
function numberView(number) {
  const el = h("p", { class: "nm-number", "aria-hidden": "true" },
    groupFromRight(number).map((group) => h("span", { class: "nm-group" }, group))
  );
  el.style.setProperty("--nm-length", number.length);
  return el;
}

/**
 * The number and what was typed, one above the other, digit by digit. Each
 * group of three is its own column so the two rows stay lined up even when a
 * long number wraps. Wrong digits are coloured and underlined; digits the
 * player never typed show as "_".
 */
function comparisonView(target, typed) {
  const positions = Array.from(target, (_, i) => i);

  const cell = (char, wrong = false) =>
    h("span", { class: wrong ? "nm-cell nm-cell--wrong" : "nm-cell" }, char);

  const columns = groupFromRight(positions).map((group) =>
    h("span", { class: "nm-pair" },
      h("span", { class: "nm-pair__row" }, group.map((i) => cell(target[i]))),
      h("span", { class: "nm-pair__row" }, group.map((i) => cell(typed[i] ?? "_", typed[i] !== target[i])))
    )
  );

  const labels = h("span", { class: "nm-pair nm-pair--labels" },
    h("span", { class: "nm-pair__row" }, h("span", { class: "nm-label" }, "Number")),
    h("span", { class: "nm-pair__row" }, h("span", { class: "nm-label" }, "You typed"))
  );

  const grid = h("div", { class: "nm-compare__grid", "aria-hidden": "true" },
    labels,
    h("span", { class: "nm-compare__groups" }, columns)
  );
  grid.style.setProperty("--nm-length", target.length);

  return h("div", { class: "nm-compare" },
    grid,
    h("p", { class: "sr-only" }, `The number was ${spellOut(target)}. You typed ${spellOut(typed)}.`)
  );
}

function verdict(digits) {
  if (digits === 0) return "Two digits is the warm-up. Go again?";
  if (digits < 6) return "A good start. It gets easier with a rhythm.";
  if (digits < 8) return "Right around average. Most people top out near seven.";
  if (digits < 10) return "Better than most people manage.";
  if (digits < 13) return "Seriously sharp memory.";
  return "That's an exceptional memory.";
}
