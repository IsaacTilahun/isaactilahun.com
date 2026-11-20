// Snake
//
// Steer a snake around a 17x17 grid, eat bits to grow, and don't run into the
// walls or yourself. Score is bits eaten (higher is better). The snake speeds
// up a little with every bit.
//
// The board moves through these states:
//
//   waiting ──first direction──▶ running ◀────▶ paused   (Space, P, the pad's middle
//                                   │                     button, or leaving the tab)
//                                   ├──wall or self──▶ crashed ──▶ result
//                                   └──board full────▶ won ──────▶ result
//
// How it moves
// ------------
// The rules work in whole cells, one cell per step, but the snake glides
// between cells instead of hopping. It stays smooth without lagging because
// every move is decided before it's drawn:
//
//   - At each step the head arrives at the centre of a cell. Right then the
//     next direction is settled (the oldest queued turn, if there is one) and
//     the move into the next cell is committed.
//   - Between steps the snake is drawn `progress` of the way (0 to 1) through
//     that committed move. The head slides toward the cell it is about to
//     enter, so it is never drawn behind where the game says it is.
//   - A turn pressed mid-step waits in a short queue and happens at the cell
//     the head is visibly heading into. What you see is what the game does.
//   - The body is one even stroke, so sliding every segment forward looks
//     exactly like holding the middle still and moving the two ends. That is
//     what gets drawn: the head point, the cell centres, the tail point.
//   - A bit is eaten as the head reaches the centre of its cell (the canvas
//     sits above the food, so the head slides over it). Growing is the tail
//     staying put for the one step after that.
//   - Whether a move is fatal is known when it's committed, so the head slides
//     on until it touches the wall or body, and the crash happens right then.

import { h, art, button, statBar, introScreen, resultScreen, sfx, flash, onSwipe, isTouchDevice, pick, clamp } from "./kit/index.js";

/* ----- Rules ----- */

const GRID_SIZE = 17;            // cells per side
const START_STEP_MS = 140;       // time to cross one cell at the start
const FASTEST_STEP_MS = 75;
const SPEEDUP_MS_PER_BIT = 2.5;
const MAX_QUEUED_TURNS = 2;      // enough for a quick U-turn, not enough to lose control
const END_PAUSE_MS = 700;        // let the crash (or win) register before the result

/* ----- Board size, in CSS pixels ----- */

const MIN_CELL_PX = 10;
const MAX_CELL_PX = 32;
const BOARD_BORDER_PX = 4;       // the board's border, both sides, rounded up

/* ----- The snake's shape, in cells ----- */

const BODY_WIDTH = 0.7;
const HEAD_RADIUS = 0.42;
const BEND_RADIUS = 0.5;         // a quarter circle from edge to edge of the corner cell
const EYE_FORWARD = 0.13;        // eyes' offset from the head's centre, toward travel
const EYE_APART = 0.18;          // and from the midline, each side

// How far through a fatal move (0 to 1) the head gets before it touches.
const WALL_CONTACT = 0.5 - HEAD_RADIUS;                // the wall is half a cell away
const BODY_CONTACT = 1 - BODY_WIDTH / 2 - HEAD_RADIUS; // the near edge of the body in the next cell

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
  W: "up", S: "down", A: "left", D: "right",
};

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      /* ----- State ----- */

      const touch = isTouchDevice();
      const bestBefore = ctx.getBest();

      let state = "waiting";
      const snake = startingSnake();   // cells, head first
      let direction = "right";         // of the committed move
      let target = null;               // the cell the committed move enters
      let crashAt = null;              // progress at which the committed move hits something, or null
      let growing = false;             // the tail stays put during this move
      let msIntoMove = 0;
      let food = null;                 // { x, y, el }
      let score = 0;
      const turnQueue = [];

      /* ----- Build the UI ----- */

      const stats = statBar([
        { key: "score", label: "Score", value: 0 },
        { key: "best", label: "Best", value: bestBefore ?? "—" },
      ]);

      const canvas = h("canvas", { class: "sn-canvas", role: "img", "aria-label": "Snake board" });
      const startNote = h("p", { class: "sn-start" },
        touch ? "Swipe or press an arrow to start" : "Press an arrow key to start");
      const resumeButton = button("Resume", resume);
      const pausedPanel = h("div", { class: "sn-paused" },
        h("p", { class: "sn-paused__title" }, "Paused"),
        resumeButton);
      const board = h("div", { class: "sn-board", tabindex: "-1" }, canvas, startNote, pausedPanel);
      const field = h("div", { class: "sn-field" }, board);

      // Touch players get a d-pad with pause in the middle; desktop gets a hint.
      const pad = touch ? {
        up: padButton("up", "Up", arrowIcon(0)),
        left: padButton("left", "Left", arrowIcon(-90)),
        pause: padButton("pause", "Pause", h("span", { class: "sn-pause-icon" })),
        right: padButton("right", "Right", arrowIcon(90)),
        down: padButton("down", "Down", arrowIcon(180)),
      } : null;
      const controls = pad
        ? h("div", { class: "sn-pad", role: "group", "aria-label": "Direction pad" },
          pad.up, pad.left, pad.pause, pad.right, pad.down)
        : h("p", { class: "sn-hint" }, "Arrow keys or WASD to steer. Space to pause.");

      const live = h("p", { class: "sr-only", "aria-live": "polite" });
      const root = h("div", { class: touch ? "sn sn--touch" : "sn" }, stats.el, field, controls, live);
      stage.replaceChildren(root);
      board.focus({ preventScroll: true });

      function padButton(name, label, icon) {
        return h("button", { type: "button", class: `sn-pad__btn sn-pad__btn--${name}`, "aria-label": label }, icon);
      }

      function arrowIcon(rotate) {
        return art("arrow", "↑", { rotate, className: "sn-pad__arrow" });
      }

      /* ----- Drawing and sizing ----- */

      const pen = canvas.getContext("2d");
      // The dot grid never moves, so it's painted once per size or theme and copied in each frame.
      const gridLayer = document.createElement("canvas");
      const gridPen = gridLayer.getContext("2d");
      let cellPx = 20;
      let colors = readColors();

      function draw() {
        const sizePx = cellPx * GRID_SIZE;
        pen.clearRect(0, 0, sizePx, sizePx);
        pen.drawImage(gridLayer, 0, 0, sizePx, sizePx);
        drawSnake(pen, {
          snake,
          direction,
          progress: msIntoMove / stepIntervalMs(score),
          growing,
          crashed: state === "crashed",
          cellPx,
          colors,
        });
      }

      // Fill whatever room the field has, in whole cells, sharp at any pixel ratio.
      function fitBoard() {
        const room = Math.min(field.clientWidth, field.clientHeight) - BOARD_BORDER_PX;
        cellPx = clamp(Math.floor(room / GRID_SIZE), MIN_CELL_PX, MAX_CELL_PX);

        const sizePx = cellPx * GRID_SIZE;
        const ratio = window.devicePixelRatio || 1;
        for (const [layer, layerPen] of [[canvas, pen], [gridLayer, gridPen]]) {
          layer.width = Math.round(sizePx * ratio);
          layer.height = Math.round(sizePx * ratio);
          layerPen.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        canvas.style.width = `${sizePx}px`;
        canvas.style.height = `${sizePx}px`;
        board.style.setProperty("--cell", `${cellPx}px`); // the food and eat rings are placed in CSS

        drawDotGrid(gridPen, cellPx, colors);
        draw();
      }

      const resizeObserver = new ResizeObserver(fitBoard);
      resizeObserver.observe(field);
      ctx.onCleanup(() => resizeObserver.disconnect());

      // Canvas colours don't follow CSS on their own, so re-read them when the theme flips.
      function refreshColors() {
        colors = readColors();
        drawDotGrid(gridPen, cellPx, colors);
        draw();
      }
      const themeObserver = new MutationObserver(refreshColors);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      ctx.onCleanup(() => themeObserver.disconnect());
      ctx.on(window.matchMedia("(prefers-color-scheme: dark)"), "change", refreshColors);

      /* ----- Moving ----- */

      // The head is at a cell centre: settle the next direction and commit to that move.
      function commitMove() {
        if (turnQueue.length) direction = turnQueue.shift();
        target = moved(snake[0], direction);
        crashAt = isOutside(target) ? WALL_CONTACT : hitsBody(target) ? BODY_CONTACT : null;
      }

      // The tail's cell is free by the time the head gets there, unless the snake is growing.
      function hitsBody(cell) {
        const solidParts = growing ? snake.length : snake.length - 1;
        for (let i = 0; i < solidParts; i++) {
          if (sameCell(snake[i], cell)) return true;
        }
        return false;
      }

      // The committed move is complete: the head is now in `target`. Eating
      // here makes the tail hold still through the next move, which is the growth.
      function step() {
        if (!growing) snake.pop();
        snake.unshift(target);
        growing = sameCell(target, food);
        if (growing) eat();
        if (state === "running") commitMove(); // unless that bite filled the board
      }

      // The clock. A slow frame can be owed several steps; they're taken in order.
      function advance(ms) {
        msIntoMove += ms;
        while (state === "running") {
          const stepMs = stepIntervalMs(score);
          if (crashAt !== null && msIntoMove >= crashAt * stepMs) {
            msIntoMove = crashAt * stepMs; // hold the frame where the head touches
            crash();
            return;
          }
          if (msIntoMove < stepMs) return;
          msIntoMove -= stepMs;
          step();
        }
      }

      ctx.loop((dt) => {
        if (state !== "running") return; // paused: the clock stops, so resuming picks up mid-move
        advance(dt * 1000);
        draw();
      });

      /* ----- Rules and state changes ----- */

      function setState(next) {
        state = next;
        root.dataset.state = next;
        pad?.pause.setAttribute("aria-label", next === "paused" ? "Resume" : "Pause");
      }

      function placeFood() {
        food?.el.remove();
        const cell = randomFreeCell(snake);
        if (!cell) {
          food = null;
          return;
        }
        // A fresh element each time, so its pop-in animation replays.
        const el = art("bit", pick(["1", "0"]), { className: "sn-food" });
        el.style.setProperty("--x", cell.x);
        el.style.setProperty("--y", cell.y);
        board.append(el);
        food = { ...cell, el };
      }

      function turn(next) {
        if (state === "waiting") {
          startMoving(next);
          return;
        }
        if (state === "paused") resume();
        if (state !== "running") return;

        // Compare with the last queued turn, so two quick presses can't fold the snake back on itself.
        const latest = turnQueue.at(-1) ?? direction;
        if (next === latest || isReverse(next, latest) || turnQueue.length >= MAX_QUEUED_TURNS) return;
        turnQueue.push(next);
      }

      // The first press is the first move, and the snake sets off on it at once.
      function startMoving(first) {
        // The snake starts as a straight line, so "backwards" just means facing the other way.
        if (isReverse(first, direction)) snake.reverse();
        direction = first;
        msIntoMove = 0;
        commitMove();
        setState("running");
      }

      function eat() {
        score += 1;
        stats.set("score", score);
        if (score > (bestBefore ?? 0)) stats.set("best", score);
        sfx.good();
        showEatRing(food);

        placeFood();
        if (!food) win();
      }

      function showEatRing(cell) {
        if (ctx.reducedMotion) return;
        const ring = h("span", { class: "sn-ring" });
        ring.style.setProperty("--x", cell.x);
        ring.style.setProperty("--y", cell.y);
        ctx.on(ring, "animationend", () => ring.remove());
        board.append(ring);
      }

      function crash() {
        setState("crashed");
        sfx.bad();
        flash(board, "bad");
        live.textContent = `Crashed. ${score} ${score === 1 ? "bit" : "bits"} eaten.`;
        ctx.timeout(() => finish(verdict(score)), END_PAUSE_MS);
      }

      function win() {
        setState("won");
        msIntoMove = 0; // the board is full: rest on the last cell
        flash(board, "good");
        live.textContent = "You filled the whole board!";
        ctx.timeout(() => finish("You filled the whole board. Wow."), END_PAUSE_MS);
      }

      function finish(message) {
        resultScreen(ctx, {
          score,
          display: String(score),
          caption: score === 1 ? "bit eaten" : "bits eaten",
          message,
          onAgain: play,
        });
      }

      function pause() {
        if (state !== "running") return;
        setState("paused");
        live.textContent = "Paused.";
      }

      function resume() {
        if (state !== "paused") return;
        setState("running");
        live.textContent = "Resumed.";
        board.focus({ preventScroll: true });
      }

      function togglePause() {
        if (state === "paused") resume();
        else pause();
      }

      /* ----- Input ----- */

      ctx.on(document, "keydown", (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const next = KEY_TO_DIRECTION[event.key];
        if (next) {
          event.preventDefault();
          turn(next);
          return;
        }

        const isPauseKey = event.key === " " || event.key === "p" || event.key === "P";
        if (!isPauseKey) return;
        // A focused button (Resume) handles its own Space.
        if (event.key === " " && event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        if (!event.repeat) togglePause();
      });

      // Swipe anywhere in the game, not just on the board.
      onSwipe(root, turn, ctx.signal);

      if (pad) {
        onPadPress(pad.up, () => turn("up"));
        onPadPress(pad.down, () => turn("down"));
        onPadPress(pad.left, () => turn("left"));
        onPadPress(pad.right, () => turn("right"));
        onPadPress(pad.pause, togglePause);
      }

      // The pad reacts on pointerdown so a turn lands the instant the thumb does.
      // Keyboard and screen-reader presses arrive as a click with detail 0, so
      // those still work without a real tap firing twice.
      function onPadPress(el, action) {
        ctx.on(el, "pointerdown", (event) => {
          if (event.button > 0) return;
          event.preventDefault();
          event.stopPropagation(); // a thumb rolling on the pad shouldn't also count as a swipe
          action();
        });
        ctx.on(el, "click", (event) => {
          if (event.detail === 0) action();
        });
      }

      ctx.on(document, "visibilitychange", () => {
        if (document.hidden) pause();
      });
      ctx.on(window, "blur", pause);

      /* ----- Start: the snake waits for the first direction ----- */

      setState("waiting");
      placeFood();
      fitBoard();
    }
  },
};

/* ----- The model: plain functions on grid cells ----- */

function startingSnake() {
  const middle = Math.floor(GRID_SIZE / 2);
  return [{ x: middle, y: middle }, { x: middle - 1, y: middle }, { x: middle - 2, y: middle }];
}

const stepIntervalMs = (score) => Math.max(FASTEST_STEP_MS, START_STEP_MS - score * SPEEDUP_MS_PER_BIT);

const moved = (cell, direction) => ({ x: cell.x + DIRECTIONS[direction].x, y: cell.y + DIRECTIONS[direction].y });

const sameCell = (a, b) => a.x === b.x && a.y === b.y;

const isOutside = ({ x, y }) => x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE;

function isReverse(a, b) {
  return DIRECTIONS[a].x === -DIRECTIONS[b].x && DIRECTIONS[a].y === -DIRECTIONS[b].y;
}

/** A random empty cell, or null when the snake fills the board. */
function randomFreeCell(snake) {
  const free = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = { x, y };
      if (!snake.some((part) => sameCell(part, cell))) free.push(cell);
    }
  }
  return free.length ? pick(free) : null;
}

function verdict(score) {
  if (score === 0) return "Ouch. That was quick.";
  if (score < 5) return "A light snack.";
  if (score < 12) return "Getting the hang of it.";
  if (score < 25) return "One hungry snake.";
  if (score < 45) return "Serious byte appetite.";
  return "Certified snake charmer.";
}

/* ----- Rendering ----- */

/** The site's ink colours, read live so the canvas matches light or dark mode. */
function readColors() {
  const css = getComputedStyle(document.documentElement);
  return {
    ink: css.getPropertyValue("--text").trim() || "#171717",
    dots: css.getPropertyValue("--muted").trim() || "#5f5f5f",
    paper: css.getPropertyValue("--background").trim() || "#fafafa",
    bad: css.getPropertyValue("--g-bad").trim() || "#c2453b",
  };
}

/** Faint dots mark the cells without boxing them in. */
function drawDotGrid(pen, cellPx, colors) {
  const sizePx = cellPx * GRID_SIZE;
  const dot = Math.max(1.5, cellPx * 0.09);
  pen.clearRect(0, 0, sizePx, sizePx);
  pen.globalAlpha = 0.32;
  pen.fillStyle = colors.dots;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      pen.fillRect((x + 0.5) * cellPx - dot / 2, (y + 0.5) * cellPx - dot / 2, dot, dot);
    }
  }
  pen.globalAlpha = 1;
}

/**
 * The snake `progress` of the way through its committed move: one round ink
 * stroke from the head point, through the cell centres, to the tail point,
 * then the head and its eyes on top.
 */
function drawSnake(pen, { snake, direction, progress, growing, crashed, cellPx, colors }) {
  const toPx = (cellCoord) => (cellCoord + 0.5) * cellPx;
  const ahead = DIRECTIONS[direction];
  const last = snake.length - 1;
  const tailProgress = growing ? 0 : progress;

  const head = snake[0];
  const headX = toPx(head.x + ahead.x * progress);
  const headY = toPx(head.y + ahead.y * progress);
  const tailX = toPx(lerp(snake[last].x, snake[last - 1].x, tailProgress));
  const tailY = toPx(lerp(snake[last].y, snake[last - 1].y, tailProgress));

  pen.strokeStyle = colors.ink;
  pen.lineWidth = BODY_WIDTH * cellPx;
  pen.lineCap = "round";
  pen.lineJoin = "round";
  pen.beginPath();
  pen.moveTo(headX, headY);
  for (let i = 0; i < last; i++) {
    const towardTail = i + 1 < last;
    const nextX = towardTail ? toPx(snake[i + 1].x) : tailX;
    const nextY = towardTail ? toPx(snake[i + 1].y) : tailY;
    // A bend can't curve further out than the moving end beside it has travelled.
    let bend = BEND_RADIUS;
    if (i === 0) bend = Math.min(bend, progress);
    if (i === last - 1) bend = Math.min(bend, 1 - tailProgress);
    pen.arcTo(toPx(snake[i].x), toPx(snake[i].y), nextX, nextY, bend * cellPx); // a straight run just lines through
  }
  pen.lineTo(tailX, tailY);
  pen.stroke();

  pen.fillStyle = crashed ? colors.bad : colors.ink;
  pen.beginPath();
  pen.arc(headX, headY, HEAD_RADIUS * cellPx, 0, Math.PI * 2);
  pen.fill();

  drawEyes(pen, headX, headY, ahead, crashed, cellPx, colors.paper);
}

/** Two dots looking where the snake is going; X's once it has crashed. */
function drawEyes(pen, headX, headY, facing, crashed, cellPx, color) {
  const radius = Math.max(1.4, cellPx * 0.09);
  // Both eyes sit a little forward of the head's centre, one either side.
  const forwardX = facing.x * EYE_FORWARD * cellPx;
  const forwardY = facing.y * EYE_FORWARD * cellPx;
  const apartX = -facing.y * EYE_APART * cellPx;
  const apartY = facing.x * EYE_APART * cellPx;
  pen.fillStyle = color;
  pen.strokeStyle = color;
  pen.lineWidth = Math.max(1.2, cellPx * 0.07);

  for (let side = -1; side <= 1; side += 2) {
    const x = headX + forwardX + apartX * side;
    const y = headY + forwardY + apartY * side;
    pen.beginPath();
    if (crashed) {
      pen.moveTo(x - radius, y - radius);
      pen.lineTo(x + radius, y + radius);
      pen.moveTo(x + radius, y - radius);
      pen.lineTo(x - radius, y + radius);
      pen.stroke();
    } else {
      pen.arc(x, y, radius, 0, Math.PI * 2);
      pen.fill();
    }
  }
}

const lerp = (from, to, amount) => from + (to - from) * amount;
