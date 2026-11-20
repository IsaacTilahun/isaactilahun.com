// Tile Memory
//
// A square grid of tiles. A few of them light up for a second, then go dark,
// and the player taps the ones they remember. Each tile found stays lit. A
// wrong tap leaves an X and counts as a miss: three misses and a life is lost,
// and the level starts over with a fresh pattern. Clearing a level adds one
// more tile to remember, and every few levels the grid grows a size.
// Three lives. The score is how many levels were cleared.
//
// Each level moves through these phases:
//
//   ready ──(short pause)──▶ show ──(1s)──▶ recall ──all found──▶ cleared ──▶ ready (next level)
//                                             │
//                                             └──3 misses──▶ lost ──▶ ready (same level, new pattern)
//                                                                 or the result, if out of lives
//
// Taps only count during "recall". The other phases are hands-off.

import { h, art, statBar, lives, introScreen, resultScreen, sfx, flash, shuffle, clamp } from "./kit/index.js";

const LIVES = 3;
const MISSES_PER_LIFE = 3;
const FIRST_LEVEL_TILES = 3;

const READY_MS = 600; // a beat on the empty grid, so the flash never catches you off guard
const SHOW_MS = 1000; // how long the pattern stays lit
const CLEARED_PAUSE_MS = 750;
const LOST_LIFE_PAUSE_MS = 1500; // long enough to see which tiles you forgot

// When the grid grows. Read as: "from level 3 on, the grid is 4x4".
const GRID_STEPS = [
  { fromLevel: 14, size: 7 },
  { fromLevel: 10, size: 6 },
  { fromLevel: 6, size: 5 },
  { fromLevel: 3, size: 4 },
  { fromLevel: 1, size: 3 },
];

// Past this share of the grid, a pattern stops being a pattern and becomes a wall.
const MAX_LIT_SHARE = 0.6;

// Arrow key -> one step across the grid.
const ARROW_STEPS = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      /* ----- State ----- */

      let level = 1;
      let livesLeft = LIVES;
      let phase = "ready";
      let size = 0; // tiles per side; 0 until the first board is built
      let tiles = []; // the tile buttons, row by row
      let pattern = new Set(); // indices of the tiles to remember
      let found = 0;
      let misses = 0;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "level", label: "Level", value: level },
        { key: "lives", label: "Lives", value: lives(livesLeft, LIVES) },
      ]);
      const board = h("div", { class: "tm-board", role: "group", "aria-label": "Tiles" });
      const status = h("p", { class: "tm-status", "aria-live": "polite" });

      stage.replaceChildren(
        h("div", { class: "tm" }, stats.el, h("div", { class: "tm-area" }, board, status))
      );

      // A fresh set of tiles, only needed when the grid changes size. Between
      // levels of the same size the tiles are just wiped, so keyboard focus stays put.
      function buildBoard(newSize) {
        const hadFocus = board.contains(document.activeElement);
        size = newSize;
        board.style.setProperty("--tm-size", size);
        tiles = Array.from({ length: size * size }, (_, index) =>
          h("button", {
            type: "button",
            class: "tm-tile",
            dataset: { index, state: "" },
            "aria-label": tileName(index, size),
          }, art("cross", "✕", { className: "tm-cross" }))
        );
        board.replaceChildren(...tiles);
        if (hadFocus) tiles[0].focus({ preventScroll: true });
      }

      // A tile's state is "" (plain), "lit", "found", "wrong" or "forgotten".
      // CSS draws each one; the label keeps screen readers in step.
      function setTile(index, state) {
        const tile = tiles[index];
        const name = tileName(index, size);
        tile.dataset.state = state;
        tile.setAttribute("aria-label", state ? `${name}, ${state}` : name);
      }

      function clearBoard() {
        tiles.forEach((_, index) => setTile(index, ""));
      }

      function say(message) {
        status.textContent = message;
      }

      function setPhase(next, message) {
        phase = next;
        board.dataset.phase = next;
        say(message);
      }

      /* ----- Rules ----- */

      function startLevel() {
        const gridSize = gridSizeFor(level);
        if (gridSize !== size) buildBoard(gridSize);
        else clearBoard();

        pattern = pickPattern(size * size, tilesFor(level, size));
        found = 0;
        misses = 0;

        setPhase("ready", "Watch the grid.");
        ctx.timeout(showPattern, READY_MS);
      }

      function showPattern() {
        pattern.forEach((index) => setTile(index, "lit"));
        setPhase("show", `Remember ${pattern.size} tiles.`);
        sfx.tick();
        ctx.timeout(startRecall, SHOW_MS);
      }

      function startRecall() {
        pattern.forEach((index) => setTile(index, ""));
        setPhase("recall", "Your turn. Tap the tiles that lit up.");
      }

      function tapTile(index) {
        if (phase !== "recall") return;
        if (tiles[index].dataset.state) return; // already found or crossed out

        if (pattern.has(index)) rightTap(index);
        else wrongTap(index);
      }

      function rightTap(index) {
        found += 1;
        setTile(index, "found");
        flash(tiles[index], "pop");
        sfx.good();

        if (found === pattern.size) levelCleared();
      }

      function wrongTap(index) {
        misses += 1;
        setTile(index, "wrong");
        flash(tiles[index], "bad");
        sfx.bad();

        if (misses >= MISSES_PER_LIFE) {
          lostLife();
          return;
        }
        const left = MISSES_PER_LIFE - misses;
        say(`Not that one. ${left} ${left === 1 ? "miss" : "misses"} left on this level.`);
      }

      function levelCleared() {
        setPhase("cleared", `Level ${level} cleared.`);
        flash(board, "good");
        sfx.great();

        level += 1;
        ctx.timeout(() => {
          stats.set("level", level);
          startLevel();
        }, CLEARED_PAUSE_MS);
      }

      function lostLife() {
        livesLeft -= 1;
        stats.set("lives", lives(livesLeft, LIVES));
        revealForgotten();

        if (livesLeft === 0) {
          setPhase("lost", "Out of lives.");
          ctx.timeout(finish, LOST_LIFE_PAUSE_MS);
          return;
        }

        setPhase("lost", `Too many misses. A life gone, and a new pattern for level ${level}.`);
        ctx.timeout(startLevel, LOST_LIFE_PAUSE_MS);
      }

      // Show the tiles that were never found, so the lost life makes sense.
      function revealForgotten() {
        pattern.forEach((index) => {
          if (tiles[index].dataset.state !== "found") setTile(index, "forgotten");
        });
      }

      function finish() {
        const cleared = level - 1;
        resultScreen(ctx, {
          score: cleared,
          display: String(cleared),
          caption: cleared === 1 ? "level cleared" : "levels cleared",
          message: verdict(cleared),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      // pointerdown so a tap registers the instant the finger lands.
      ctx.on(board, "pointerdown", (event) => {
        if (event.button !== 0) return;
        const tile = event.target.closest(".tm-tile");
        if (!tile) return;
        event.preventDefault();
        tapTile(Number(tile.dataset.index));
      });

      // Enter or Space on a focused tile fires a click with detail 0. Real
      // pointer clicks (detail >= 1) were already handled on pointerdown.
      ctx.on(board, "click", (event) => {
        const tile = event.target.closest(".tm-tile");
        if (tile && event.detail === 0) tapTile(Number(tile.dataset.index));
      });

      // Arrow keys walk the grid, so the keyboard doesn't need 49 Tab presses.
      ctx.on(board, "keydown", (event) => {
        const step = ARROW_STEPS[event.key];
        const tile = event.target.closest(".tm-tile");
        if (!step || !tile) return;
        event.preventDefault();

        const index = Number(tile.dataset.index);
        const row = clamp(Math.floor(index / size) + step.row, 0, size - 1);
        const col = clamp((index % size) + step.col, 0, size - 1);
        tiles[row * size + col].focus();
      });

      startLevel();
      // The Play button just disappeared; give keyboard players somewhere to start.
      tiles[0].focus({ preventScroll: true });
    }
  },
};

function gridSizeFor(level) {
  return GRID_STEPS.find((step) => level >= step.fromLevel).size;
}

/** One more tile each level, but never so many that the grid is mostly lit. */
function tilesFor(level, size) {
  const wanted = FIRST_LEVEL_TILES + level - 1;
  return Math.min(wanted, Math.floor(size * size * MAX_LIT_SHARE));
}

/** `count` distinct tile indices out of `cellCount`. */
function pickPattern(cellCount, count) {
  const indices = Array.from({ length: cellCount }, (_, i) => i);
  return new Set(shuffle(indices).slice(0, count));
}

function tileName(index, size) {
  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  return `Row ${row}, column ${col}`;
}

function verdict(levels) {
  if (levels >= 15) return "A photographic memory. Seriously impressive.";
  if (levels >= 10) return "Sharp as a tack.";
  if (levels >= 6) return "Strong memory. The big grids are tough.";
  if (levels >= 3) return "Good start. It gets busy fast.";
  return "Warm-up done. Go again?";
}
