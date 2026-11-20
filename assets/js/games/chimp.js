// Chimp Test
//
// Numbers 1, 2, 3... sit in random cells of a grid. They stay visible until
// the player taps 1; from then on the rest are hidden and have to be tapped
// in order from memory. Clear them all and the next level adds one more
// number. A wrong tap costs a life: the board shows where everything was,
// then the same level comes back with a new layout. Losing all three ends the
// run. The score is the most numbers cleared in one go (higher is better).
//
// Each level moves through these phases:
//
//   memorise ──tap 1──▶ recall ──tap the last number──▶ cleared ──(pause)──▶ memorise (one more number)
//       │                  │
//       └────wrong tap─────┴──▶ missed ──(pause)──▶ memorise (same size, new layout)
//                                  │
//                                  └──last life──▶ result

import { h, statBar, lives, introScreen, resultScreen, sfx, flash, shuffle } from "./kit/index.js";

const START_NUMBERS = 4;
const LIVES = 3;
const WIDE_GRID = { cols: 8, rows: 5 };
const NARROW_GRID = { cols: 5, rows: 8 };   // the same 40 cells, turned for phones
const MAX_NUMBERS = 40;                     // one number per cell, at most
const NEXT_LEVEL_MS = 750;                  // a beat to enjoy the clear
const RETRY_MS = 1700;                      // long enough to see where you went wrong
const GAME_OVER_MS = 1900;

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      let levelSize = START_NUMBERS;  // how many numbers this level deals
      let nextNumber = 1;             // the number the player has to tap next
      let livesLeft = LIVES;
      let mostCleared = 0;            // the score: most numbers cleared in one attempt
      let phase = "memorise";

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "numbers", label: "Numbers", value: levelSize },
        { key: "lives", label: "Lives", value: lives(LIVES, LIVES) },
      ]);
      const board = h("div", { class: "ch-board", role: "group", "aria-label": "Number grid", tabindex: "-1" });
      const status = h("p", { class: "ch-status", "aria-live": "polite" });
      stage.replaceChildren(
        h("div", { class: "ch" }, stats.el, h("div", { class: "ch-area" }, board, status))
      );
      board.focus({ preventScroll: true });

      /* ----- Rules ----- */

      function startLevel() {
        phase = "memorise";
        nextNumber = 1;
        stats.set("numbers", levelSize);
        dealTiles();
        status.textContent = "Tap 1 when you're ready.";
      }

      function dealTiles() {
        // Picked per level, so turning a phone mid-run takes effect on the next layout.
        const grid = stage.clientWidth >= stage.clientHeight ? WIDE_GRID : NARROW_GRID;
        const numberInCell = placeNumbers(levelSize, grid.cols * grid.rows);

        // Re-dealing removes the focused tile; keep keyboard focus on the board.
        const hadFocus = board.contains(document.activeElement);
        board.style.setProperty("--cols", grid.cols);
        board.style.setProperty("--rows", grid.rows);
        board.replaceChildren(
          ...numberInCell.map((number) => (number ? numberTile(number) : emptyCell()))
        );
        if (hadFocus) board.focus({ preventScroll: true });
      }

      function hideNumbers() {
        phase = "recall";
        for (const tile of remainingTiles()) {
          tile.textContent = "";
          tile.classList.add("is-hidden");
          tile.setAttribute("aria-label", "Hidden number");
        }
        status.textContent = `Now 2 to ${levelSize}, in order.`;
      }

      function clearTile(tile) {
        // A disabled button can't hold focus; hand it to the board so Tab still works.
        if (document.activeElement === tile) board.focus({ preventScroll: true });
        tile.disabled = true;
        tile.classList.add("is-cleared");
        mostCleared = Math.max(mostCleared, nextNumber);
        nextNumber += 1;
      }

      function levelCleared() {
        phase = "cleared";
        sfx.great();
        flash(board, "good");

        if (levelSize === MAX_NUMBERS) {
          status.textContent = "Every cell cleared!";
          ctx.timeout(finish, NEXT_LEVEL_MS);
          return;
        }

        status.textContent = `All ${levelSize} cleared. Next, ${levelSize + 1}.`;
        levelSize += 1;
        ctx.timeout(startLevel, NEXT_LEVEL_MS);
      }

      function loseLife(wrongTile) {
        phase = "missed";
        livesLeft -= 1;
        stats.set("lives", lives(livesLeft, LIVES));
        sfx.bad();
        flash(wrongTile, "bad");
        revealAnswers(wrongTile);

        // Before 1 is tapped nothing is hidden yet, so the useful hint is "start with 1".
        const hint = nextNumber === 1 ? "Start with 1." : `${nextNumber} came next.`;

        if (livesLeft === 0) {
          status.textContent = `Out of lives. ${hint}`;
          ctx.timeout(finish, GAME_OVER_MS);
          return;
        }

        status.textContent = `A life gone. ${hint} Same ${levelSize}, new spots.`;
        ctx.timeout(startLevel, RETRY_MS);
      }

      // Show every number that was left: the wrong pick in red, the right one in green.
      function revealAnswers(wrongTile) {
        for (const tile of remainingTiles()) {
          const number = Number(tile.dataset.number);
          tile.textContent = number;
          tile.removeAttribute("aria-label");
          tile.classList.remove("is-hidden");
          tile.classList.add("is-revealed");
          tile.classList.toggle("is-next", number === nextNumber);
        }
        wrongTile.classList.add("is-wrong");
      }

      function remainingTiles() {
        return board.querySelectorAll(".ch-tile:not(.is-cleared)");
      }

      function finish() {
        resultScreen(ctx, {
          score: mostCleared,
          display: String(mostCleared),
          caption: mostCleared === 1 ? "number" : "numbers",
          message: verdict(mostCleared),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      // Taps only count while numbers are on the board; the pauses ignore them.
      function onTap(tile) {
        if (phase !== "memorise" && phase !== "recall") return;

        const number = Number(tile.dataset.number);
        if (number !== nextNumber) {
          loseLife(tile);
          return;
        }

        sfx.good();
        clearTile(tile);
        if (number === 1) hideNumbers();
        if (nextNumber > levelSize) levelCleared();
      }

      // click covers mouse, touch and Enter/Space on a focused tile in one
      // event, so nothing fires twice. Speed isn't measured, so its small
      // delay over pointerdown doesn't matter here.
      ctx.on(board, "click", (event) => {
        const tile = event.target.closest(".ch-tile");
        if (tile) onTap(tile);
      });

      startLevel();
    }
  },
};

/** A paper tile showing its number. data-number keeps the answer once the text is hidden. */
function numberTile(number) {
  return h("button", { type: "button", class: "ch-tile", dataset: { number } }, String(number));
}

function emptyCell() {
  return h("span", { class: "ch-cell", "aria-hidden": "true" });
}

/**
 * Scatter 1..count across `cells` cells. Returns one entry per cell, in grid
 * order: the number in that cell, or 0 for an empty one.
 */
function placeNumbers(count, cells) {
  const layout = new Array(cells).fill(0);
  const cellIndexes = Array.from({ length: cells }, (_, index) => index);
  shuffle(cellIndexes)
    .slice(0, count)
    .forEach((cell, i) => {
      layout[cell] = i + 1;
    });
  return layout;
}

function verdict(numbers) {
  if (numbers < 5) return "A warm-up. Go again?";
  if (numbers < 8) return "Solid memory.";
  if (numbers < 11) return "Sharp. The chimps are watching.";
  if (numbers < 15) return "That's chimp territory.";
  return "Better than most chimps.";
}
