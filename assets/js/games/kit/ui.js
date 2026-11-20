// The shared building blocks every game is made of: buttons, the stat bar,
// the start and result screens, and quick feedback animations. Using these
// (instead of one-off markup) is what makes the games feel like one set.
//
// Every game follows the same flow:
//
//   introScreen  ->  play a round  ->  resultScreen  ->  (Play again)  ->  play...
//
// Both screens end the current round first (ctx.reset()), so whatever the
// round left running — key handlers, timers, animation loops — stops.

import { h, svg, focusSoon, restartAnimation } from "./dom.js";
import { art } from "./art.js";
import { formatBest } from "./storage.js";
import { sfx } from "./sound.js";
import { prefersReducedMotion } from "./util.js";

/** A standard button. variant: "primary" (solid ink) or "ghost" (outline). */
export function button(label, onClick, { variant = "primary", className = "", ...attributes } = {}) {
  return h("button", {
    type: "button",
    class: `g-btn g-btn--${variant} ${className}`.trim(),
    onClick,
    ...attributes,
  }, label);
}

/**
 * A row of labelled live numbers (Score, Time, Best...).
 *
 *   const stats = statBar([{ key: "score", label: "Score", value: 0 }]);
 *   stats.set("score", 3);                     // bumps to draw the eye
 *   stats.set("time", "12s", { bump: false }); // quiet, for values that tick
 *   stats.cell("score");                       // the whole stat, to decorate it
 */
export function statBar(items) {
  const cells = {};
  const values = {};

  const el = h("dl", { class: "g-stats" },
    items.map(({ key, label, value = "" }) => {
      values[key] = h("dd", { class: "g-stat__value" }, String(value));
      cells[key] = h("div", { class: "g-stat", dataset: { stat: key } },
        h("dt", { class: "g-stat__label" }, label),
        values[key]
      );
      return cells[key];
    })
  );

  function set(key, value, { bump = true } = {}) {
    const valueEl = values[key];
    if (!valueEl || valueEl.textContent === String(value)) return;
    valueEl.textContent = String(value);
    if (bump) restartAnimation(valueEl, "g-bump");
  }

  return { el, set, cell: (key) => cells[key] };
}

/**
 * A little flame after a streak stat: faint at 0, inked from 1, flickering in
 * the accent colour from 2 in a row. Returns a function that sets the streak.
 *
 *   const showStreak = streakFlame(stats.cell("streak"));
 *   showStreak(3);
 */
export function streakFlame(stat) {
  stat.classList.add("g-stat--flame");
  stat.append(art("fire", flameIcon(), { className: "g-flame" }));

  return (streak) => {
    if (streak >= 2) stat.dataset.heat = "hot";
    else if (streak === 1) stat.dataset.heat = "lit";
    else delete stat.dataset.heat;
  };
}

/** Lives as dots: lives(2, 3) -> "● ● ○". */
export const lives = (left, total) =>
  Array.from({ length: total }, (_, i) => (i < left ? "●" : "○")).join(" ");

/**
 * A thin bar that drains over `ms` (e.g. "memorise this before it's hidden").
 * Purely visual: the game decides what happens when time is up.
 */
export function countdownBar(ms) {
  const fill = h("span", { class: "g-countdown__fill" });
  const el = h("div", { class: "g-countdown", "aria-hidden": "true" }, fill);
  if (!prefersReducedMotion()) {
    fill.animate([{ scale: "1 1" }, { scale: "0 1" }], { duration: ms, easing: "linear", fill: "forwards" });
  }
  return el;
}

/**
 * The first screen of every game: the one-line "how to play", the saved best,
 * and a big Play button. `extra` can add something small (like a setting).
 */
export function introScreen(ctx, { onStart, label = "Play", extra = null } = {}) {
  ctx.reset();

  const best = ctx.getBest();
  const play = button(label, onStart, { className: "g-btn--big" });

  ctx.stage.replaceChildren(
    h("div", { class: "g-screen g-screen--intro" },
      h("p", { class: "g-screen__how" }, ctx.game.how),
      extra,
      play,
      best != null ? h("p", { class: "g-screen__best" }, formatBest(ctx.game.best.format, best)) : null
    )
  );

  focusSoon(play);
  return play;
}

/**
 * The last screen of every round: the big result, a "New best!" badge when
 * earned, and Play again. `score` must be a number; it's saved if it beats
 * the old best (data/games.js says whether higher or lower is better).
 *
 *   resultScreen(ctx, { score: 214, display: "214 ms", caption: "average", onAgain: play })
 */
export function resultScreen(ctx, { score, display, caption = "", message = "", onAgain, extra = null }) {
  ctx.reset();

  const { isNewBest, best } = ctx.submitScore(score);
  if (isNewBest) sfx.great();

  const again = button("Play again", onAgain, { className: "g-btn--big" });
  const showOldBest = !isNewBest && best != null && best !== score;

  ctx.stage.replaceChildren(
    h("div", { class: "g-screen g-screen--result", role: "status" },
      isNewBest ? h("p", { class: "g-badge" }, "New best!") : null,
      h("p", { class: "g-screen__big" }, display ?? String(score)),
      caption ? h("p", { class: "g-screen__caption" }, caption) : null,
      message ? h("p", { class: "g-screen__message" }, message) : null,
      extra,
      again,
      showOldBest ? h("p", { class: "g-screen__best" }, formatBest(ctx.game.best.format, best)) : null
    )
  );

  focusSoon(again);
  return again;
}

/**
 * Quick feedback on an element: "good" (a green ring), "bad" (a shake) or
 * "pop" (a little scale). Uses the Web Animations API on the independent
 * `translate` / `scale` properties, so it plays on top of whatever transform
 * or CSS animation the element already has.
 */
export function flash(el, kind = "good") {
  if (!el?.animate) return;
  const reduced = prefersReducedMotion();

  if (kind === "good") {
    const green = getComputedStyle(document.documentElement).getPropertyValue("--g-good").trim() || "#2f8f5b";
    el.animate([{ boxShadow: `0 0 0 0 ${green}` }, { boxShadow: "0 0 0 14px transparent" }], { duration: 420, easing: "ease-out" });
  } else if (kind === "bad" && !reduced) {
    el.animate(
      [{ translate: "0" }, { translate: "-7px" }, { translate: "6px" }, { translate: "-4px" }, { translate: "3px" }, { translate: "0" }],
      { duration: 380, easing: "ease-out" }
    );
  } else if (kind === "pop" && !reduced) {
    el.animate([{ scale: "1" }, { scale: "1.12" }, { scale: "1" }], { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }
}

/** A line-drawn flame: the stand-in until art("fire") has a real drawing. */
function flameIcon() {
  return svg("svg", { class: "g-flame__icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
    svg("path", { d: "M12.6 2.5c.4 3.4 5.4 5.4 5.4 10.9a6 6 0 0 1-12 0c0-2.8 1.5-4.6 3-5.8-.2 2.1.6 3.6 1.9 4.2-.2-3.9.2-6.6 1.7-9.3z" }),
    svg("path", { d: "M12 21c-1.6 0-2.6-1.2-2.6-2.6 0-1.6 1.2-2.6 2.2-3.6.1 1 .7 1.6 1.4 1.8.6-.6.9-1.4 1-2.2 1 1 1.6 2.3 1.6 3.6 0 1.7-1.4 3-3.6 3z" })
  );
}
