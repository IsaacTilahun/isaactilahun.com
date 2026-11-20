// Tic-Tac-Toe
//
// You're X and always go first; the computer is O. Three in a row wins.
// A win or a draw keeps your run going (a draw doesn't break the streak).
// A loss ends the run, and your score is the win streak it ended.
//
// The computer is beatable on purpose: it always takes a win and always
// blocks yours, but otherwise it picks a random square 30% of the time and
// the best square (minimax) the rest.
//
// Each game on the board moves through these states:
//
//   player ──tap a square──▶ thinking ──(short pause)──▶ player …
//      │                        │
//      └──── three in a row, or a full board ────▶ over
//                                                   ├─ win / draw ──▶ Next game ──▶ player
//                                                   └─ loss ──▶ result screen
//
// The grid and the marks are wobbly SVG strokes that draw themselves in, so
// no two boards look quite the same. Drawings for art("x") / art("o") replace
// the strokes once they exist.

import { h, svg, art, hasArt, button, statBar, streakFlame, introScreen, resultScreen, sfx, tone, flash, pick, randInt, isTouchDevice, focusSoon } from "./kit/index.js";

const THINK_MIN_MS = 350;
const THINK_MAX_MS = 600;
const LOSS_PAUSE_MS = 1500;          // long enough to see the computer's line drawn
const LOSS_PAUSE_REDUCED_MS = 1000;  // no line animation to wait for
const RANDOM_MOVE_CHANCE = 0.3;
const GRID_STROKE_GAP_MS = 70;       // the four grid lines are drawn one after another
const STRIKE_OVERSHOOT = 34;         // how far the win line runs past the end squares (board units)

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const SQUARE_NAMES = [
  "Top left", "Top middle", "Top right",
  "Middle left", "Centre", "Middle right",
  "Bottom left", "Bottom middle", "Bottom right",
];

// Keys 1–9 laid out like a numpad, so each key sits where its square does.
const SQUARE_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
const ARROW_STEPS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export default {
  mount(stage, ctx) {
    // The tally lasts while the game is open; the streak lasts one run.
    const session = { wins: 0, draws: 0, losses: 0, streak: 0 };

    // Leaving mid-run still counts the streak towards your best.
    ctx.onLeave(() => {
      if (session.streak > 0) ctx.submitScore(session.streak);
    });

    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();
      session.streak = 0;

      let cells = Array(9).fill(null); // "X", "O" or null
      let turn = "player";             // "player" | "thinking" | "over"
      let gamesThisRun = 0;

      /* ----- Build the UI ----- */

      const stats = statBar([
        { key: "wins", label: "Wins", value: session.wins },
        { key: "draws", label: "Draws", value: session.draws },
        { key: "losses", label: "Losses", value: session.losses },
        { key: "streak", label: "Streak", value: session.streak },
      ]);
      const showStreakHeat = streakFlame(stats.cell("streak"));

      // Keyboard players get numpad hints and focus on the board; on a phone both are just noise.
      const keyboardPlayer = !isTouchDevice();
      const squares = SQUARE_NAMES.map((name, i) =>
        h("button", { type: "button", class: "ttt-square", "aria-label": `${name}, empty` },
          h("span", { class: "ttt-mark" }),
          keyboardPlayer ? h("span", { class: "ttt-key", "aria-hidden": "true" }, SQUARE_KEYS[i]) : null
        )
      );
      const grid = svg("svg", { class: "ttt-lines", viewBox: "0 0 300 300", "aria-hidden": "true" });
      const strike = svg("svg", { class: "ttt-lines ttt-lines--strike", viewBox: "0 0 300 300", "aria-hidden": "true" });
      const board = h("div", { class: "ttt-board", role: "group", "aria-label": "Board. Keys 1 to 9 pick a square, laid out like a numpad." },
        grid,
        h("div", { class: "ttt-squares" }, squares),
        strike
      );
      const status = h("p", { class: "ttt-status", "aria-live": "polite" });
      const next = button("Next game", () => startGame(), { className: "ttt-next", hidden: true });

      // .ttt is a size container so the board can fill the space it's given;
      // .ttt-body is what gets laid out, since a container can't restyle itself.
      stage.replaceChildren(
        h("div", { class: "ttt" },
          h("div", { class: "ttt-body" },
            stats.el,
            h("div", { class: "ttt-play" },
              board,
              h("div", { class: "ttt-foot" }, status, next)
            )
          )
        )
      );

      /* ----- Showing state ----- */

      // `announce` is read out before the text but never shown, e.g. where O just moved.
      function setStatus(text, { mood = "", thinking = false, announce = "" } = {}) {
        status.dataset.mood = mood;
        status.replaceChildren(
          announce ? h("span", { class: "sr-only" }, `${announce} `) : "",
          text,
          thinking ? thinkingDots() : ""
        );
      }

      function showStats() {
        stats.set("wins", session.wins);
        stats.set("draws", session.draws);
        stats.set("losses", session.losses);
        stats.set("streak", session.streak);
        showStreakHeat(session.streak);
      }

      function placeMark(i, mark) {
        cells[i] = mark;
        const square = squares[i];
        square.querySelector(".ttt-mark").replaceChildren(markFor(mark));
        square.classList.add("is-filled");
        square.setAttribute("aria-disabled", "true");
        square.setAttribute("aria-label", `${SQUARE_NAMES[i]}, ${mark}`);
      }

      function strikeThrough(line, winner) {
        line.forEach((i) => squares[i].classList.add("is-win"));
        board.classList.add(winner === "X" ? "is-won" : "is-lost");
        strike.replaceChildren(stroke(strikePath(line), "ttt-stroke--strike"));
      }

      /* ----- Rules ----- */

      function startGame() {
        cells = Array(9).fill(null);
        turn = "player";
        gamesThisRun++;

        board.className = "ttt-board";
        grid.replaceChildren(...gridStrokes()); // a freshly drawn grid every game
        strike.replaceChildren();
        squares.forEach((square, i) => {
          square.className = "ttt-square";
          square.querySelector(".ttt-mark").replaceChildren();
          square.removeAttribute("aria-disabled");
          square.setAttribute("aria-label", `${SQUARE_NAMES[i]}, empty`);
        });
        next.hidden = true;

        setStatus(gamesThisRun === 1 ? "Your move. You're X." : "Your move.");
        if (keyboardPlayer) focusSoon(squares[4]);
      }

      function playerMove(i) {
        if (turn !== "player") return;
        if (cells[i]) {
          flash(squares[i], "bad");
          return;
        }
        placeMark(i, "X");
        sfx.tick();
        if (!finishIfOver()) computerTurn();
      }

      function computerTurn() {
        turn = "thinking";
        board.classList.add("is-thinking");
        board.setAttribute("aria-busy", "true");
        setStatus("Thinking", { thinking: true });

        // A short pause so it feels like a move, not a reflex.
        ctx.timeout(() => {
          board.classList.remove("is-thinking");
          board.removeAttribute("aria-busy");

          const move = chooseComputerMove(cells);
          placeMark(move, "O");
          computerMoveSound();

          const announce = `O took the ${SQUARE_NAMES[move].toLowerCase()}.`;
          if (finishIfOver(announce)) return;
          turn = "player";
          setStatus("Your move.", { announce });
        }, randInt(THINK_MIN_MS, THINK_MAX_MS));
      }

      /** Ends the game if it's won or the board is full. Returns true if it ended. */
      function finishIfOver(announce = "") {
        const outcome = outcomeOf(cells);
        if (!outcome) return false;

        turn = "over";
        board.classList.add("is-done");
        if (outcome.winner === "X") playerWon(outcome.line);
        else if (outcome.winner === "O") computerWon(outcome.line, announce);
        else gameDrawn();
        return true;
      }

      function playerWon(line) {
        session.wins++;
        session.streak++;
        strikeThrough(line, "X");
        sfx.great();
        offerNextGame(session.streak > 1 ? `You win! ${session.streak} in a row.` : "You win!", "good");
      }

      function gameDrawn() {
        session.draws++;
        board.classList.add("is-draw");
        sfx.tick();
        offerNextGame(session.streak > 0 ? "Draw. Your streak is safe." : "Draw. Go again?");
      }

      function computerWon(line, announce) {
        session.losses++;
        showStats();
        strikeThrough(line, "O");
        sfx.bad();
        flash(board, "bad");
        setStatus("The computer wins.", { mood: "bad", announce });

        // Let the winning line sink in before the result screen.
        ctx.timeout(endRun, ctx.reducedMotion ? LOSS_PAUSE_REDUCED_MS : LOSS_PAUSE_MS);
      }

      // A win or a draw: the run carries on whenever the player is ready.
      function offerNextGame(text, mood = "") {
        showStats();
        setStatus(text, { mood });
        flash(status, "pop");
        next.hidden = false;
        if (keyboardPlayer) focusSoon(next);
      }

      function endRun() {
        const streak = session.streak;
        session.streak = 0; // so leaving now doesn't submit it a second time
        resultScreen(ctx, {
          score: streak,
          display: String(streak),
          caption: "win streak",
          message: verdict(streak),
          onAgain: play,
        });
      }

      /* ----- Input ----- */

      squares.forEach((square, i) => ctx.on(square, "click", () => playerMove(i)));

      ctx.on(document, "keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const square = SQUARE_KEYS.indexOf(event.key);
        if (square >= 0) {
          event.preventDefault();
          playerMove(square);
        } else if (Object.hasOwn(ARROW_STEPS, event.key)) {
          moveFocus(event);
        } else if (isNextGameKey(event)) {
          event.preventDefault();
          startGame();
        }
      });

      // Arrow keys walk between squares once one of them has focus.
      function moveFocus(event) {
        const from = squares.indexOf(document.activeElement);
        if (from < 0) return;
        event.preventDefault();

        const [rowStep, colStep] = ARROW_STEPS[event.key];
        const row = Math.floor(from / 3) + rowStep;
        const col = (from % 3) + colStep;
        if (row < 0 || row > 2 || col < 0 || col > 2) return;
        squares[row * 3 + col].focus();
      }

      // After a win or draw, N starts the next game. Enter and Space do too,
      // unless a button has focus: it already handles them itself.
      function isNextGameKey(event) {
        if (turn !== "over" || next.hidden) return false;
        if (event.key === "n" || event.key === "N") return true;
        const onButton = document.activeElement?.tagName === "BUTTON";
        return (event.key === "Enter" || event.key === " ") && !onButton;
      }

      showStats();
      startGame();
    }
  },
};

/* ---------- Reading the board (pure) ---------- */

/** { winner: "X" | "O", line } for three in a row, { winner: null } for a full board, else null. */
function outcomeOf(cells) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return { winner: cells[a], line };
  }
  return cells.every(Boolean) ? { winner: null } : null;
}

const emptySquares = (cells) => cells.flatMap((mark, i) => (mark ? [] : [i]));

/* ---------- The computer's move (pure) ---------- */

/** Win if it can, block if it must, otherwise mostly play perfectly. */
function chooseComputerMove(cells) {
  const win = completingSquare(cells, "O");
  if (win != null) return win;

  const block = completingSquare(cells, "X");
  if (block != null) return block;

  if (Math.random() < RANDOM_MOVE_CHANCE) return pick(emptySquares(cells));
  return bestMove(cells);
}

/** The empty square that would give `mark` three in a row, or null. */
function completingSquare(cells, mark) {
  for (const line of LINES) {
    const owned = line.filter((i) => cells[i] === mark);
    const empty = line.filter((i) => !cells[i]);
    if (owned.length === 2 && empty.length === 1) return empty[0];
  }
  return null;
}

/** The highest-scoring square for O, picking randomly among ties so games vary. */
function bestMove(cells) {
  const board = cells.slice();
  let bestScore = -Infinity;
  let bestSquares = [];

  for (const i of emptySquares(board)) {
    board[i] = "O";
    const score = minimax(board, "X", 1);
    board[i] = null;

    if (score > bestScore) {
      bestScore = score;
      bestSquares = [i];
    } else if (score === bestScore) {
      bestSquares.push(i);
    }
  }
  return pick(bestSquares);
}

/**
 * How good this board is for O if both sides play perfectly from here.
 * Wins score 10 minus the moves it took, so quicker wins (and slower losses)
 * are preferred. Mutates `board` while searching but always puts it back.
 */
function minimax(board, toMove, depth) {
  const outcome = outcomeOf(board);
  if (outcome?.winner === "O") return 10 - depth;
  if (outcome?.winner === "X") return depth - 10;
  if (outcome) return 0;

  const scores = emptySquares(board).map((i) => {
    board[i] = toMove;
    const score = minimax(board, toMove === "O" ? "X" : "O", depth + 1);
    board[i] = null;
    return score;
  });
  return toMove === "O" ? Math.max(...scores) : Math.min(...scores);
}

/* ---------- Words and sounds ---------- */

function verdict(streak) {
  if (streak === 0) return "The computer got you. Shake it off and go again.";
  if (streak === 1) return "One win before it caught you. Not bad.";
  if (streak <= 3) return "A nice little run.";
  if (streak <= 6) return "That's a seriously good streak.";
  return "Are you sure you're not the computer?";
}

/** O's move gets its own soft, low note: neither a reward nor a warning. */
function computerMoveSound() {
  tone(392, { duration: 0.07, type: "sine", volume: 0.05 });
}

/* ---------- Hand-drawn strokes ---------- */

// Every stroke has pathLength="1", so CSS can draw any of them in with the
// same stroke-dashoffset animation, whatever its real length.

function stroke(d, className, delayMs = 0) {
  return svg("path", {
    d,
    class: `ttt-stroke ${className}`,
    pathLength: 1,
    style: delayMs ? `animation-delay: ${delayMs}ms` : null,
  });
}

/** The owner's drawing for this mark if there is one, otherwise a fresh stroke. */
function markFor(mark) {
  const artName = mark.toLowerCase(); // art slots "x" and "o"
  if (hasArt(artName)) return art(artName, "", { className: "ttt-drawing" });
  return mark === "X" ? drawX() : drawO();
}

function drawX() {
  return markSvg(
    stroke(wobblyLine(nudge([25, 25], 3), nudge([75, 75], 3), 4), "ttt-stroke--x1"),
    stroke(wobblyLine(nudge([75, 25], 3), nudge([25, 75], 3), 4), "ttt-stroke--x2")
  );
}

function drawO() {
  const [cx, cy] = nudge([50, 50], 1.5);
  return markSvg(stroke(wobblyCircle(cx, cy, 26 + jitter(1.5)), "ttt-stroke--o"));
}

function markSvg(...strokes) {
  return svg("svg", { class: "ttt-svg", viewBox: "0 0 100 100", "aria-hidden": "true" }, ...strokes);
}

function gridStrokes() {
  const lines = [
    [[100, 10], [100, 290]], [[200, 10], [200, 290]], // verticals
    [[10, 100], [290, 100]], [[10, 200], [290, 200]], // horizontals
  ];
  return lines.map(([from, to], i) =>
    stroke(wobblyLine(nudge(from, 4), nudge(to, 4), 4), "ttt-stroke--grid", i * GRID_STROKE_GAP_MS)
  );
}

/** Through the winning three, running past both ends the way a pen does. */
function strikePath(line) {
  const centreOf = (i) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
  const [x1, y1] = centreOf(line[0]);
  const [x2, y2] = centreOf(line[2]);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const over = STRIKE_OVERSHOOT / Math.hypot(dx, dy);

  const start = [x1 - dx * over, y1 - dy * over];
  const end = [x2 + dx * over, y2 + dy * over];
  return wobblyLine(nudge(start, 4), nudge(end, 4), 5);
}

/** A slightly bent line, like one drawn by hand without a ruler. */
function wobblyLine([x1, y1], [x2, y2], bend) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / length, dx / length]; // sideways, at right angles to the line

  // Two control points a third of the way in from each end, each pushed sideways a little.
  const control = (t) => {
    const push = jitter(bend);
    return [x1 + dx * t + nx * push, y1 + dy * t + ny * push];
  };
  return `M${point([x1, y1])} C${point(control(1 / 3))} ${point(control(2 / 3))} ${point([x2, y2])}`;
}

/** An O drawn counter-clockwise that overshoots its start a little, like a real pen. */
function wobblyCircle(cx, cy, radius) {
  const STEPS = 12;
  const start = -Math.PI / 2 + jitter(0.9);
  const sweep = Math.PI * 2 * (1.05 + Math.random() * 0.07);
  const squash = 1 + jitter(0.07);

  const points = [];
  for (let i = 0; i <= STEPS; i++) {
    const angle = start - (sweep * i) / STEPS;
    const tailIn = i === STEPS ? 0.9 : 1; // the pen drifts inward as it lifts off
    const r = radius * (1 + jitter(0.035)) * tailIn;
    points.push([cx + Math.cos(angle) * r * squash, cy + (Math.sin(angle) * r) / squash]);
  }
  return curveThrough(points);
}

/** A smooth curve through every point (Catmull-Rom, written as cubic Béziers). */
function curveThrough(points) {
  let d = `M${point(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const before = points[i - 1] || points[i];
    const from = points[i];
    const to = points[i + 1];
    const after = points[i + 2] || to;

    const control1 = [from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6];
    const control2 = [to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6];
    d += ` C${point(control1)} ${point(control2)} ${point(to)}`;
  }
  return d;
}

/** Random offset in [-amount, amount]: the "hand" in hand-drawn. */
const jitter = (amount) => (Math.random() * 2 - 1) * amount;
const nudge = ([x, y], amount) => [x + jitter(amount), y + jitter(amount)];

/** "x y" rounded to one decimal, to keep the path data short. */
const point = ([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;

/* ---------- Small pieces of UI ---------- */

/** The bouncing "..." after "Thinking". */
function thinkingDots() {
  return h("span", { class: "ttt-dots", "aria-hidden": "true" }, h("i"), h("i"), h("i"));
}
