// Memory Match
//
// Sixteen face-down cards hide eight pairs of code symbols. Turn two at a
// time: a matching pair stays face up, anything else flips back after a
// moment. Find every pair in as few moves as you can (two cards turned = one
// move), so lower is better. The clock starts on the first flip and is only
// there for bragging rights.
//
// Each card moves through these states:
//
//   down ──tap──▶ up ──partner matches──▶ matched
//                  │
//                  └──partner doesn't──▶ miss ──(short pause, taps locked)──▶ down
//
// When the last pair is matched the board does a little wave, then the result.

import { h, art, hasArt, statBar, introScreen, resultScreen, sfx, tone, flash, shuffle, clamp, focusSoon } from "./kit/index.js";

const GRID_SIZE = 4;
const PAIRS = (GRID_SIZE * GRID_SIZE) / 2;
const FLIP_MS = 380;              // keep in step with the flip transition in memory.css
const FLIP_BACK_MS = 750;         // how long a wrong pair stays face up
const WIN_PAUSE_MS = 1100;        // time for the last pair to land and the board to wave
const WIN_PAUSE_STILL_MS = 600;   // the same pause with reduced motion: no wave to wait for
const CLOCK_TICK_MS = 250;

// Each symbol, and what a screen reader should say for it (many skip punctuation).
const SYMBOLS = {
  "{ }": "curly braces",
  "</>": "tag",
  "=>": "arrow",
  "&&": "and and",
  "[ ]": "square brackets",
  ";": "semicolon",
  "#": "hash",
  "$": "dollar",
  "!=": "not equal",
  "++": "plus plus",
  "//": "double slash",
  "::": "double colon",
};

// Arrow key -> [column step, row step] across the grid.
const ARROW_STEPS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      const still = ctx.reducedMotion;
      let moves = 0;
      let pairsFound = 0;
      let firstCard = null;   // face up, waiting for its partner
      let locked = false;     // true while a wrong pair is on show
      let startedAt = 0;      // set by the first flip
      let clock = 0;
      let focusIndex = 0;     // the one card in the tab order (roving tabindex)

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "moves", label: "Moves", value: 0 },
        { key: "pairs", label: "Pairs", value: `0/${PAIRS}` },
        { key: "time", label: "Time", value: "0s" },
      ]);
      const status = h("p", { class: "mm-status", "aria-live": "polite" }, "Flip any card to start.");
      const cards = dealDeck().map(createCard);
      const board = h("div", { class: "mm-board", role: "group", "aria-label": `Memory cards, ${GRID_SIZE} by ${GRID_SIZE}` },
        cards.map((card) => card.el)
      );
      const root = h("div", { class: still ? "mm mm--still" : "mm" }, stats.el, board, status);

      stage.replaceChildren(root);
      focusSoon(cards[0].el);

      /* ----- Rules ----- */

      function flipCard(card) {
        if (locked || card.state !== "down") return;

        startClock();
        setCardState(card, "up");
        sfx.tick();

        if (!firstCard) {
          firstCard = card;
          status.textContent = "Now find its twin.";
          return;
        }

        const pair = [firstCard, card];
        firstCard = null;
        moves++;
        stats.set("moves", moves);

        if (pair[0].symbol === pair[1].symbol) keepPair(pair);
        else showMiss(pair);
      }

      function keepPair(pair) {
        pairsFound++;
        pair.forEach((card) => setCardState(card, "matched"));
        stats.set("pairs", `${pairsFound}/${PAIRS}`);
        sfx.good();
        // Celebrate once the second card has finished turning over.
        ctx.timeout(() => pair.forEach((card) => flash(card.el, "pop")), FLIP_MS);

        if (pairsFound === PAIRS) {
          finish();
          return;
        }
        status.textContent = `Match. ${PAIRS - pairsFound} to go.`;
      }

      function showMiss(pair) {
        locked = true;
        pair.forEach((card) => setCardState(card, "miss"));
        // A gentle low note rather than sfx.bad: missing is most of this game, not a failure.
        tone(220, { duration: 0.09, type: "triangle", volume: 0.05 });
        status.textContent = "Not a pair.";

        ctx.timeout(() => pair.forEach((card) => flash(card.el, "bad")), FLIP_MS);
        ctx.timeout(() => {
          pair.forEach((card) => setCardState(card, "down"));
          locked = false;
        }, FLIP_BACK_MS);
      }

      function startClock() {
        if (startedAt) return;
        startedAt = performance.now();
        clock = ctx.interval(() => {
          stats.set("time", formatTime(secondsSince(startedAt)), { bump: false });
        }, CLOCK_TICK_MS);
      }

      // Every card is matched now, so flipCard ignores any further taps on its own.
      function finish() {
        clearInterval(clock);

        const seconds = secondsSince(startedAt);
        stats.set("time", formatTime(seconds), { bump: false });
        status.textContent = `All ${PAIRS} pairs in ${moves} moves.`;
        ctx.timeout(() => root.classList.add("mm--won"), FLIP_MS);

        ctx.timeout(() => {
          resultScreen(ctx, {
            score: moves,
            display: `${moves} moves`,
            caption: `all ${PAIRS} pairs in ${formatTime(seconds)}`,
            message: verdict(moves),
            onAgain: play,
          });
        }, still ? WIN_PAUSE_STILL_MS : WIN_PAUSE_MS);
      }

      /* ----- Input ----- */

      // Only one card is tabbable at a time; arrow keys move that spot around.
      function setRovingIndex(index) {
        cards[focusIndex].el.tabIndex = -1;
        focusIndex = index;
        cards[index].el.tabIndex = 0;
      }

      function moveFocus(index) {
        setRovingIndex(index);
        cards[index].el.focus({ preventScroll: true });
      }

      // click covers taps, mouse clicks, and Enter/Space on a focused card.
      cards.forEach((card) => {
        ctx.on(card.el, "click", () => {
          setRovingIndex(card.index);
          flipCard(card);
        });
      });

      ctx.on(document, "keydown", (event) => {
        const step = ARROW_STEPS[event.key];
        if (!step || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();

        // Step from whichever card has focus. A click doesn't always move focus
        // (Safari), so this beats trusting focusIndex. From outside the board, land on it.
        const focused = cards.findIndex((card) => card.el === document.activeElement);
        moveFocus(focused === -1 ? focusIndex : neighbour(focused, step));
      });
    }
  },
};

/** Eight random symbols, each twice, shuffled. */
function dealDeck() {
  const symbols = shuffle(Object.keys(SYMBOLS)).slice(0, PAIRS);
  return shuffle([...symbols, ...symbols]);
}

/** One face-down card: a button holding a back and a front that turn over together. */
function createCard(symbol, index) {
  const el = h("button", { type: "button", class: "mm-card", tabindex: index === 0 ? "0" : "-1" },
    h("span", { class: "mm-card__inner", "aria-hidden": "true" },
      h("span", { class: "mm-face mm-face--back" }, art("cardBack", "?", { className: "mm-back-art" })),
      h("span", { class: "mm-face mm-face--front" },
        // A drawn card outline frames the face; without one, CSS draws the border.
        hasArt("card") ? art("card", "", { className: "mm-front-art" }) : null,
        h("span", { class: "mm-symbol" }, symbol)
      )
    )
  );
  el.style.setProperty("--i", index); // staggers the deal and the win wave

  const card = { el, symbol, index, state: "down" };
  setCardState(card, "down");
  return card;
}

/** The CSS styles each state from data-state; the label keeps screen readers in step. */
function setCardState(card, state) {
  card.state = state;
  card.el.dataset.state = state;
  card.el.setAttribute("aria-label", describeCard(card));
}

/** What a screen reader hears for a card. Face-down cards give nothing away. */
function describeCard({ index, symbol, state }) {
  const position = `Card ${index + 1}`;
  if (state === "down") return `${position}, face down`;
  if (state === "matched") return `${position}, ${SYMBOLS[symbol]}, matched`;
  return `${position}, ${SYMBOLS[symbol]}`;
}

/** The card one step away in the grid, stopping at the edges. */
function neighbour(index, [colStep, rowStep]) {
  const col = clamp((index % GRID_SIZE) + colStep, 0, GRID_SIZE - 1);
  const row = clamp(Math.floor(index / GRID_SIZE) + rowStep, 0, GRID_SIZE - 1);
  return row * GRID_SIZE + col;
}

function secondsSince(start) {
  return Math.floor((performance.now() - start) / 1000);
}

/** 42 -> "42s", 75 -> "1:15" */
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function verdict(moves) {
  if (moves <= 10) return "Photographic memory. Seriously.";
  if (moves <= 14) return "Sharp. Hardly a wasted flip.";
  if (moves <= 18) return "Nicely done.";
  if (moves <= 24) return "Got them all. Fewer moves next time?";
  return "Every pair found. Now try it with fewer flips.";
}
