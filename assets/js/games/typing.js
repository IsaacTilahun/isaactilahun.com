// Type Fast
//
// Type three short lines of real code, one after another, as fast as you can.
// Each line comes with a language tag and a one-line note on what it does, so
// every round is also a tiny lesson. The clock starts on the first key. The
// score is words per minute (a "word" is five correct characters), higher is
// better. A wrong character turns red and has to be fixed before moving on.
//
//   intro ──Play──▶ line 1 ──typed exactly──▶ line 2 ──▶ line 3 ──typed exactly──▶ result
//                     │
//                     └── first key starts the clock
//
// Typing goes through a real <input> laid invisibly over the code, so a tap
// opens the phone keyboard. We read the input's whole value on every change
// (instead of raw key events), which copes with autocorrect, IMEs and smart
// punctuation.

import { h, art, statBar, introScreen, resultScreen, sfx, flash, shuffle, isTouchDevice } from "./kit/index.js";
import { TYPING_LINES } from "./data/typing.js";

const LINES_PER_ROUND = 3;
const AVOID_REPEATS_FOR_ROUNDS = 6; // a line won't come back within this many rounds
const LIVE_WPM_EVERY_MS = 200;
const LIVE_WPM_AFTER_MS = 1000;     // the first second swings wildly, so wait it out
const CARET_REST_MS = 600;          // the caret holds still while you type, blinks when you pause
const SLIDE_IN_MS = 300;
const NOTE_DELAY_MS = 140;          // the note follows the code, so the eye lands on the code first
const RESULT_DELAY_MS = 750;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Keys that would move the caret off the end of the line. Typing only ever happens at the end.
const BLOCKED_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter"];

// Long lines may wrap on a phone. These are the friendliest places to break a line of code.
const BREAK_AFTER = [".", "/", "("];

export default {
  mount(stage, ctx) {
    const touch = isTouchDevice();
    const recentlyTyped = [];

    introScreen(ctx, { onStart: play, extra: teaser() });

    // Three lines the player hasn't seen in the last few rounds, so Play again feels fresh.
    function chooseLines() {
      const fresh = TYPING_LINES.filter((line) => !recentlyTyped.includes(line));
      const pool = fresh.length >= LINES_PER_ROUND ? fresh : TYPING_LINES;
      const chosen = shuffle(pool).slice(0, LINES_PER_ROUND);

      recentlyTyped.push(...chosen);
      recentlyTyped.splice(0, recentlyTyped.length - LINES_PER_ROUND * AVOID_REPEATS_FOR_ROUNDS);
      return chosen;
    }

    function play() {
      ctx.reset();

      /* ----- State ----- */

      const lines = chooseLines();
      let index = 0;      // which line is being typed
      let typed = "";     // what's in the input right now, normalised
      let startedAt = 0;  // time of the first key; 0 until then
      let doneChars = 0;  // characters in finished lines (all correct by definition)
      let keys = 0;       // characters the player has typed, right or wrong
      let goodKeys = 0;   // ...of which landed on the right character
      let finished = false;
      let charSpans = []; // one per character of the current line
      let endSpan = null; // an empty span after the last character, for the caret to sit on
      let caretSpan = null;
      let liveTimer = 0;
      let caretRestTimer = 0;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "wpm", label: "WPM", value: "—" },
        { key: "accuracy", label: "Accuracy", value: "—" },
        { key: "line", label: "Line", value: `1/${LINES_PER_ROUND}` },
      ]);

      const tag = h("span", { class: "tf-tag" });
      const code = h("div", { class: "tf-code", "aria-hidden": "true" });
      const note = h("p", { class: "tf-note", id: "tf-note" });
      const input = h("input", {
        class: "tf-input",
        type: "text",
        name: "tf-line",
        "aria-describedby": "tf-note",
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        enterkeyhint: "next",
      });
      const cover = h("div", { class: "tf-cover", "aria-hidden": "true" },
        h("span", { class: "tf-cover__label" }, touch ? "Tap here to type" : "Click here to type")
      );
      const panel = h("div", { class: "tf-panel" }, tag, code, note, input, cover);
      const hint = h("p", { class: "tf-hint" });
      const live = h("p", { class: "sr-only", "aria-live": "polite" });
      const root = h("div", { class: "tf", dataset: { focus: "on" } },
        stats.el,
        h("div", { class: "tf-main" }, panel, hint),
        live
      );
      stage.replaceChildren(root);

      /* ----- Drawing ----- */

      const currentLine = () => lines[index];

      function showLine({ animate }) {
        const { lang, code: text, explain } = currentLine();

        tag.textContent = lang;
        note.textContent = explain;
        charSpans = characterSpans(text);
        endSpan = h("span", { class: "tf-char tf-char--end" });
        caretSpan = null;
        code.replaceChildren(...withBreakPoints(charSpans), endSpan);
        input.setAttribute("aria-label", `Line ${index + 1} of ${LINES_PER_ROUND}, ${lang}. Type: ${text}`);

        if (animate) {
          slideIn(tag);
          slideIn(code);
          slideIn(note, NOTE_DELAY_MS);
        }
        paint();
      }

      // Colour each typed character right or wrong, and park the caret after the last one.
      function paint() {
        const target = currentLine().code;
        charSpans.forEach((span, i) => {
          const isTyped = i < typed.length;
          span.classList.toggle("tf-char--ok", isTyped && typed[i] === target[i]);
          span.classList.toggle("tf-char--bad", isTyped && typed[i] !== target[i]);
        });

        caretSpan?.classList.remove("tf-char--next");
        caretSpan = charSpans[typed.length] ?? endSpan;
        caretSpan.classList.add("tf-char--next");
      }

      function slideIn(el, delay = 0) {
        if (ctx.reducedMotion) return;
        el.animate(
          [{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0" }],
          { duration: SLIDE_IN_MS, delay, easing: EASE, fill: "backwards" }
        );
      }

      function setHint(text, tone = "") {
        hint.textContent = text;
        hint.dataset.tone = tone;
      }

      function showMistakeHint() {
        const hasMistake = countMatching(typed, currentLine().code) < typed.length;
        setHint(hasMistake ? "Backspace to fix the red bits." : "", hasMistake ? "bad" : "");
      }

      function updateLiveWpm() {
        const ms = performance.now() - startedAt;
        if (ms < LIVE_WPM_AFTER_MS) return;
        const correct = doneChars + countMatching(typed, currentLine().code);
        stats.set("wpm", wordsPerMinute(correct, ms), { bump: false });
      }

      // While keys are coming in the caret holds still; it starts blinking again once you pause.
      function pauseCaretBlink() {
        root.classList.add("is-typing");
        clearTimeout(caretRestTimer);
        caretRestTimer = ctx.timeout(() => root.classList.remove("is-typing"), CARET_REST_MS);
      }

      /* ----- Rules ----- */

      function startClock() {
        startedAt = performance.now();
        liveTimer = ctx.interval(updateLiveWpm, LIVE_WPM_EVERY_MS);
      }

      // Called on every change to the input: score the new keys, then redraw.
      function handleTyping() {
        if (finished) return;
        const target = currentLine().code;
        const value = normalizeQuotes(input.value);
        const added = insertedText(typed, value);

        if (added.text && !startedAt) startClock();
        scoreKeys(added.text, target.slice(added.at));

        // Nothing goes past the end of the line.
        typed = value.slice(0, target.length);
        if (value.length > target.length) flash(code, "bad");
        if (input.value !== typed) input.value = typed;

        pauseCaretBlink();
        paint();

        if (typed === target) completeLine();
        else showMistakeHint();
      }

      // Every typed character counts towards accuracy, even ones later fixed.
      function scoreKeys(text, expected) {
        if (!text) return; // a deletion: nothing new to score

        const good = countMatching(text, expected);
        keys += text.length;
        goodKeys += good;
        stats.set("accuracy", `${percent(goodKeys, keys)}%`, { bump: false });

        if (good < text.length) sfx.bad();
        else sfx.tick();
      }

      function completeLine() {
        doneChars += currentLine().code.length;
        index++;
        typed = "";
        input.value = "";
        flash(panel, "good");

        if (index === LINES_PER_ROUND) {
          finish();
          return;
        }

        sfx.good();
        stats.set("line", `${index + 1}/${LINES_PER_ROUND}`);
        showLine({ animate: true });
        setHint(index === LINES_PER_ROUND - 1 ? "Last one." : "Nice. Next line.", "good");

        const { lang, code: text, explain } = currentLine();
        live.textContent = `Line ${index + 1}, ${lang}: ${text}. ${explain}`;
      }

      function finish() {
        finished = true;
        clearInterval(liveTimer);
        root.dataset.state = "done";
        input.readOnly = true;
        input.blur(); // drops the phone keyboard so the result screen has the whole card

        const ms = Math.max(1, performance.now() - startedAt);
        const wpm = wordsPerMinute(doneChars, ms);
        const accuracy = percent(goodKeys, keys);

        stats.set("wpm", wpm);
        setHint("Done.", "good");
        live.textContent = `Done. ${wpm} words per minute.`;
        sfx.good();

        // A short pause so the last line's tick lands before the screen changes.
        ctx.timeout(() => {
          resultScreen(ctx, {
            score: wpm,
            display: `${wpm} wpm`,
            caption: `${accuracy}% accuracy in ${(ms / 1000).toFixed(1)}s`,
            message: verdict(wpm),
            extra: recap(lines),
            onAgain: play,
          });
        }, RESULT_DELAY_MS);
      }

      /* ----- Input ----- */

      function focusInput() {
        if (!finished && document.activeElement !== input) input.focus({ preventScroll: true });
      }

      // Typing only happens at the end of the line, so keep the caret there.
      function caretToEnd() {
        const end = input.value.length;
        if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
      }

      ctx.on(input, "input", handleTyping);
      ctx.on(input, "focus", () => {
        root.dataset.focus = "on";
        caretToEnd();
      });
      ctx.on(input, "blur", () => { root.dataset.focus = "off"; });
      ctx.on(input, "pointerup", caretToEnd);
      ctx.on(input, "select", caretToEnd);
      ctx.on(input, "keydown", (event) => {
        if (BLOCKED_KEYS.includes(event.key)) event.preventDefault();
      });
      ctx.on(input, "paste", (event) => event.preventDefault());
      ctx.on(input, "drop", (event) => event.preventDefault());

      // A tap anywhere else in the game keeps the keyboard up instead of dismissing it.
      ctx.on(stage, "pointerdown", (event) => {
        if (finished || event.target === input) return;
        event.preventDefault();
        focusInput();
      });

      // Typing while something else has focus jumps back to the line. Space and
      // Enter on a focused button still press it, for keyboard users.
      ctx.on(document, "keydown", (event) => {
        if (finished || event.target === input || event.ctrlKey || event.metaKey || event.altKey) return;
        if (typeof event.key !== "string") return; // autofill fires keydowns without a key
        if (event.key.length !== 1 && event.key !== "Backspace") return;
        if (event.target.closest?.("button") && (event.key === " " || event.key === "Enter")) return;
        focusInput();
      });

      // Clicking the sound switch in the card's header would otherwise leave focus
      // on it, and the next Space would toggle sound instead of typing a space.
      // (detail is 0 when the switch was pressed from the keyboard; leave focus there.)
      ctx.on(document, "click", (event) => {
        if (event.detail && event.target.closest?.("[data-arcade-sound]")) focusInput();
      });

      showLine({ animate: false });
      setHint("Start typing. The clock starts on your first key.");

      // Focus inside the Play tap itself: phones only open the keyboard during a user gesture.
      input.focus({ preventScroll: true });
      if (document.activeElement !== input) root.dataset.focus = "off";
    }
  },
};

/* ----- Building blocks ----- */

// The intro's little terminal prompt.
function teaser() {
  return h("p", { class: "tf-teaser", "aria-hidden": "true" },
    h("span", { class: "tf-teaser__prompt" }, "$"),
    " type fast",
    h("span", { class: "tf-teaser__caret" })
  );
}

// One span per character, so each can be coloured right or wrong on its own.
function characterSpans(text) {
  return [...text].map((char) =>
    h("span", { class: char === " " ? "tf-char tf-char--space" : "tf-char" }, char)
  );
}

// A <wbr> after dots, slashes and brackets, so a long line wraps on a phone
// at "localStorage.|setItem(" rather than in the middle of a word.
function withBreakPoints(spans) {
  return spans.flatMap((span) => (BREAK_AFTER.includes(span.textContent) ? [span, h("wbr")] : [span]));
}

// The result screen's "what you just typed", so the lesson sticks.
function recap(lines) {
  return h("ul", { class: "tf-recap", "aria-label": "What you typed" },
    lines.map(({ lang, code, explain }) =>
      h("li", { class: "tf-recap__item" },
        art("check", "✓", { className: "tf-recap__check" }),
        h("span", { class: "tf-recap__text" },
          h("code", { class: "tf-recap__code" }, code),
          h("span", { class: "tf-recap__note" }, `${lang}. ${explain}`)
        )
      )
    )
  );
}

/* ----- Typing maths ----- */

/**
 * What changed between two versions of the input: the text that was added
 * and where. Comparing from both ends means a word replaced by autocorrect,
 * or an edit in the middle, is counted as exactly the characters that changed.
 */
function insertedText(before, after) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;

  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) end++;

  return { at: start, text: after.slice(start, after.length - end) };
}

/** How many characters of `typed` match `target` at the same position. */
function countMatching(typed, target) {
  let matches = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) matches++;
  }
  return matches;
}

/** The standard measure: one "word" is five characters. */
function wordsPerMinute(chars, ms) {
  return Math.round(chars / 5 / (ms / 60000));
}

/** Rounded percentage that only says 100% when it really is perfect. */
function percent(part, total) {
  if (!total || part === total) return 100;
  return Math.min(99, Math.round((part / total) * 100));
}

/** Phone keyboards "smarten" punctuation. Turn it back into the plain ASCII the code uses. */
function normalizeQuotes(value) {
  return value
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/—/g, "--")
    .replace(/[–−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " "); // a non-breaking space
}

function verdict(wpm) {
  if (wpm >= 90) return "Are you sure you're not a compiler?";
  if (wpm >= 70) return "Blazing. Your keyboard needs a break.";
  if (wpm >= 50) return "Fast fingers. Very respectable.";
  if (wpm >= 35) return "Nice and steady.";
  if (wpm >= 20) return "Warming up. One more go?";
  return "Slow and steady ships the code.";
}
