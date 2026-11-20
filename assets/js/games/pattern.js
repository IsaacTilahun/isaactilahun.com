// Pattern
//
// Nine tiles in a 3x3 grid. Each round the game lights up a sequence of tiles,
// one longer than last time, and the player taps it back in the same order.
// The whole sequence replays every round, a touch faster as it grows. One
// wrong tile ends the game; the score is the longest sequence repeated.
//
//   watch ──(sequence played)──▶ input ──(all correct)──▶ nice ──(pause)──▶ watch (one longer)
//                                  │
//                                  └──(wrong tile)──▶ over ──(show the right tile)──▶ result
//
// The keys mirror the grid: the numpad (7 8 9 / 4 5 6 / 1 2 3) or the left
// hand (q w e / a s d / z x c).

import { h, statBar, introScreen, resultScreen, sfx, tone, flash, randInt } from "./kit/index.js";

const GRID_SIZE = 3;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

// Playback speed: each extra tile shaves a little off, down to a floor.
const LIT_MS = 450;
const MIN_LIT_MS = 280;
const LIT_STEP_MS = 10;
const GAP_MS = 150;
const MIN_GAP_MS = 90;
const GAP_STEP_MS = 4;

const BEFORE_PLAYBACK_MS = 450; // a breath between "Watch…" and the first tile
const TAP_LIT_MS = 200;
const MAX_NOTE_MS = 400;        // slow playback steps still get a short note, not a drone
const NEXT_ROUND_MS = 600;
const REVEAL_MS = 1400;         // how long the right tile shows before the result

// One note per tile: a major pentatonic scale from C4 to G5, rising in reading
// order. Any sequence on it sounds a bit like a tune, which helps memory.
const TONES_HZ = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0];

const TILE_NAMES = ["top left", "top", "top right", "left", "centre", "right", "bottom left", "bottom", "bottom right"];

// Both key layouts, in tile order (top-left first).
const NUMPAD_KEYS = "789456123";
const LETTER_KEYS = "qweasdzxc";

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play, extra: miniBoard() });

    function play() {
      ctx.reset();

      const sequence = [];
      const savedBest = ctx.getBest() ?? 0;
      const offTimers = []; // per tile, so each one dims on its own schedule
      let state = "watch";
      let step = 0;         // how far into the sequence the player has got this round
      let completed = 0;    // the longest sequence repeated in full

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "round", label: "Round", value: "1" },
        { key: "best", label: "Best", value: savedBest ? String(savedBest) : "—" },
      ]);
      const status = h("p", { class: "pt-status" });
      const progress = h("p", { class: "pt-progress", "aria-hidden": "true" });
      const announcer = h("p", { class: "sr-only", "aria-live": "polite" });

      const tiles = Array.from({ length: TILE_COUNT }, (_, index) =>
        h("button", {
          type: "button",
          class: "pt-tile",
          "aria-label": `${TILE_NAMES[index]} (key ${NUMPAD_KEYS[index]} or ${LETTER_KEYS[index].toUpperCase()})`,
        },
          h("span", { class: "pt-hint", "aria-hidden": "true" }, `${NUMPAD_KEYS[index]} ${LETTER_KEYS[index]}`)
        )
      );
      const board = h("div", { class: "pt-board", role: "group", "aria-label": "Tiles" }, tiles);

      stage.replaceChildren(
        h("div", { class: "pt" },
          stats.el,
          h("div", { class: "pt-area" }, status, board, progress),
          announcer
        )
      );

      /* ----- State changes ----- */

      function setState(next, text, spoken = text) {
        state = next;
        board.dataset.state = next;
        board.setAttribute("aria-disabled", String(next !== "input"));
        status.textContent = text;
        announcer.textContent = spoken;
      }

      function startRound() {
        sequence.push(nextTile(sequence));
        step = 0;
        stats.set("round", String(sequence.length));
        progress.textContent = "";
        setState("watch", "Watch…", "Watch.");
        ctx.timeout(() => playSequence(0), BEFORE_PLAYBACK_MS);
      }

      // Light the tiles one after another, then hand over to the player.
      function playSequence(index) {
        if (index === sequence.length) {
          setState("input", "Your turn", "Your turn.");
          showProgress();
          return;
        }

        const lit = litMs(sequence.length);
        lightTile(sequence[index], lit);
        ctx.timeout(() => playSequence(index + 1), lit + gapMs(sequence.length));
      }

      // Light a tile and play its note. Re-lighting a tile that's still on just
      // pushes back its "off" timer, so quick double taps never cut it short.
      function lightTile(index, ms) {
        clearTimeout(offTimers[index]);
        tiles[index].classList.add("is-lit");
        tone(TONES_HZ[index], { duration: Math.min(ms, MAX_NOTE_MS) / 1000, type: "triangle", volume: 0.09 });
        offTimers[index] = ctx.timeout(() => tiles[index].classList.remove("is-lit"), ms);
      }

      function showProgress() {
        progress.textContent = `${step} / ${sequence.length}`;
      }

      function checkTap(index) {
        if (index !== sequence[step]) {
          wrongTile(index);
          return;
        }

        lightTile(index, TAP_LIT_MS);
        step += 1;
        showProgress();
        if (step === sequence.length) sequenceDone();
      }

      function sequenceDone() {
        completed = sequence.length;
        if (completed > savedBest) stats.set("best", String(completed));
        setState("nice", "Nice.", "Correct.");
        ctx.timeout(sfx.good, TAP_LIT_MS); // after the tile's own note, not on top of it
        ctx.timeout(startRound, NEXT_ROUND_MS);
      }

      // The tapped tile shakes red and the right one lights up, so the player
      // sees exactly where it went wrong before the result.
      function wrongTile(tapped) {
        const expected = sequence[step];
        tiles.forEach((tile, i) => {
          clearTimeout(offTimers[i]);
          tile.classList.remove("is-lit");
        });

        setState("over", "It was this one.", `Wrong tile. It was ${TILE_NAMES[expected]}.`);
        sfx.bad();
        tiles[tapped].classList.add("is-wrong");
        tiles[expected].classList.add("is-expected");
        flash(tiles[tapped], "bad");
        ctx.timeout(finish, REVEAL_MS);
      }

      function finish() {
        resultScreen(ctx, {
          score: completed,
          display: String(completed),
          caption: "longest pattern",
          message: verdict(completed),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      function onTileTap(index) {
        if (state === "input") checkTap(index);
        else if (state === "watch") flash(status, "pop"); // "not yet", so the tap doesn't feel dead
      }

      tiles.forEach((tile, index) => {
        // pointerdown so the tile reacts the instant a finger lands.
        ctx.on(tile, "pointerdown", (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          onTileTap(index);
        });
        // Enter/Space on a focused tile arrives as a click with detail 0. Real
        // clicks were already handled on pointerdown, so they're skipped here.
        ctx.on(tile, "click", (event) => {
          if (event.detail === 0) onTileTap(index);
        });
      });

      ctx.on(document, "keydown", (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
        const index = tileForKey(event);
        if (index < 0) return;
        event.preventDefault();
        onTileTap(index);
      });

      startRound();
    }
  },
};

// A random tile. Repeats are part of the challenge, but three of the same in a
// row just looks like the game is stuck.
function nextTile(sequence) {
  const last = sequence.at(-1);
  const twoInARow = sequence.length >= 2 && sequence.at(-2) === last;

  let tile = randInt(0, TILE_COUNT - 1);
  while (twoInARow && tile === last) tile = randInt(0, TILE_COUNT - 1);
  return tile;
}

// How long each tile stays lit, and the pause after it, for a sequence this long.
function litMs(length) {
  return Math.max(MIN_LIT_MS, LIT_MS - (length - 1) * LIT_STEP_MS);
}

function gapMs(length) {
  return Math.max(MIN_GAP_MS, GAP_MS - (length - 1) * GAP_STEP_MS);
}

/** The tile a key press stands for, or -1. */
function tileForKey(event) {
  // Numpad keys go by position, so they still work with Num Lock off (when
  // they report "Home", "ArrowUp" and so on instead of digits).
  if (event.code.startsWith("Numpad")) {
    const tile = NUMPAD_KEYS.indexOf(event.code.slice("Numpad".length));
    if (tile >= 0) return tile;
  }

  const key = event.key.toLowerCase();
  if (key.length !== 1) return -1;
  const digit = NUMPAD_KEYS.indexOf(key);
  return digit >= 0 ? digit : LETTER_KEYS.indexOf(key);
}

/** A small decorative 3x3 for the intro screen; CSS walks a light across it. */
function miniBoard() {
  return h("div", { class: "pt-mini", "aria-hidden": "true" },
    Array.from({ length: TILE_COUNT }, () => h("span", { class: "pt-mini__tile" }))
  );
}

function verdict(length) {
  if (length >= 15) return "Elephant-grade memory.";
  if (length >= 11) return "That's a seriously long pattern.";
  if (length >= 8) return "Sharp memory.";
  if (length >= 5) return "Nice run. Can you beat it?";
  if (length >= 1) return "Warming up. Go again?";
  return "Watch closely, then copy the order.";
}
