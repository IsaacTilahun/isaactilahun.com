// Higher or Lower
//
// Two cards: one number you can see and one that's hidden. Guess whether the
// hidden number is higher or lower. A right guess adds one to the streak, and
// the revealed card slides over to become the next number to beat. One wrong
// guess ends the run. The score is the streak (higher is better).
//
// Each turn goes:
//
//   asking ──guess──▶ revealing (the number counts up) ──right──▶ sliding ──▶ asking …
//                                   │
//                                   └──wrong──▶ result screen
//
// The facts live in data/higher-lower.js, so this file is only the game.

import { h, art, hasArt, button, statBar, streakFlame, introScreen, resultScreen, sfx, flash, pick, formatNumber, isTouchDevice } from "./kit/index.js";
import { FACTS } from "./data/higher-lower.js";

const RECENT_FACTS = 12;           // a fact won't come back within this many cards
const COUNT_UP_MS = 600;           // the hidden number counting up from zero
const PAUSE_AFTER_RIGHT_MS = 480;  // a beat to enjoy the tick before moving on
const PAUSE_AFTER_WRONG_MS = 1200; // long enough to read the real answer
const LEAVE_MS = 160;              // the old card fading out
const SLIDE_MS = 420;              // the revealed card moving over, the new one dealt in
const DEAL_STAGGER_MS = 90;        // gap between two cards dealt together
const PLUS_ONE_MS = 700;           // how long the "+1" floats (matches the CSS)
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"; // same curve as --g-ease

const GUESSES = {
  higher: { label: "Higher", keys: "ArrowUp H", arrowTurn: 0 },
  lower: { label: "Lower", keys: "ArrowDown L", arrowTurn: 180 },
};
const KEY_TO_GUESS = { arrowup: "higher", h: "higher", arrowdown: "lower", l: "lower" };

export default {
  mount(stage, ctx) {
    // Kept across rounds, so "Play again" doesn't open on the same facts.
    const recentFacts = [];

    // Lives outside play() so leaving mid-run still counts toward the best:
    // every right guess is final. (The result screen saves it the normal way.)
    let streak = 0;
    ctx.onLeave(() => ctx.submitScore(streak));

    introScreen(ctx, { onStart: play });

    // A fact that hasn't come up lately and doesn't tie with the card it'll be
    // compared to (a tie would have no right answer).
    function drawFact(excludeValue = null) {
      const fact = pick(FACTS.filter((f) => !recentFacts.includes(f) && f.value !== excludeValue));
      recentFacts.push(fact);
      if (recentFacts.length > RECENT_FACTS) recentFacts.shift();
      return fact;
    }

    function play() {
      ctx.reset();

      /* ----- State ----- */

      const best = ctx.getBest() ?? 0;
      let shown = null;  // the card with the number to beat
      let hidden = null; // the card being guessed
      let busy = false;  // from a guess until the next question, extra presses are ignored
      streak = 0;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "streak", label: "Streak", value: 0 },
        { key: "best", label: "Best", value: best || "—" },
      ]);
      const streakStat = stats.cell("streak");
      const showStreakHeat = streakFlame(streakStat);

      const duel = h("div", { class: "hl-duel" },
        h("span", { class: "hl-vs", "aria-hidden": "true" }, "vs")
      );
      const status = h("p", { class: "hl-status", "aria-live": "polite" });
      const buttons = { higher: guessButton("higher"), lower: guessButton("lower") };
      const controls = h("div", { class: "hl-controls" }, buttons.higher, buttons.lower);

      stage.replaceChildren(
        h("div", { class: "hl" },
          stats.el,
          h("div", { class: "hl-main" }, duel, status, controls, isTouchDevice() ? null : keysHint())
        )
      );

      /* ----- Turn flow ----- */

      function dealFirstPair() {
        shown = makeCard(drawFact());
        hidden = makeCard(drawFact(shown.fact.value), { hidden: true });
        duel.append(shown.el, hidden.el);
        placeCards();
        dealIn([shown, hidden]);
        ask();
      }

      function ask() {
        busy = false;
        setButtonsLocked(false);
        setStatus(`Higher or lower than ${formatValue(shown.fact)}?`);
      }

      // The whole turn, top to bottom. Every await is a wait() that never
      // resolves once the round has ended, so nothing below it runs late.
      async function guess(direction) {
        if (busy) return;
        busy = true;
        setButtonsLocked(true, direction);
        flash(buttons[direction], "pop");
        sfx.tick();

        const answer = hidden.fact.value > shown.fact.value ? "higher" : "lower";
        await revealNumber(hidden);

        if (direction !== answer) {
          markWrong(answer);
          await wait(PAUSE_AFTER_WRONG_MS);
          endRun();
          return;
        }

        addToStreak();
        markRight(answer);
        await wait(PAUSE_AFTER_RIGHT_MS);
        await slideToNextCard();
        ask();
      }

      // Turn the hidden card over and count its number up from zero.
      // Instant with reduced motion.
      function revealNumber(card) {
        turnOver(card);
        const finalText = formatValue(card.fact);
        if (ctx.reducedMotion) {
          setCardValue(card, finalText);
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          let startedAt = 0;
          const stop = ctx.loop((_, now) => {
            startedAt ||= now;
            const progress = Math.min((now - startedAt) / COUNT_UP_MS, 1);
            const eased = 1 - (1 - progress) ** 3; // quick start, gentle landing
            // Sized for the final number, so the text doesn't grow as it counts.
            setCardValue(card, formatValue(card.fact, Math.round(card.fact.value * eased)), finalText.length);
            if (progress < 1) return;
            stop();
            resolve();
          });
        });
      }

      function addToStreak() {
        streak += 1;
        stats.set("streak", streak);
        if (streak > best) stats.set("best", streak);
        showStreakHeat(streak);
        popPlusOne();
      }

      function markRight(answer) {
        hidden.el.classList.add("is-right");
        hidden.mark.replaceChildren(art("check", "✓", { className: "hl-mark-art" }));
        flash(hidden.el, "good");
        if (streak % 5 === 0) sfx.great();
        else sfx.good();
        setStatus(`Yes, ${formatValue(hidden.fact)} is ${answer}.`, "good");
      }

      function markWrong(answer) {
        hidden.el.classList.add("is-wrong");
        hidden.mark.replaceChildren(art("cross", "✗", { className: "hl-mark-art" }));
        flash(hidden.el, "bad");
        sfx.bad();
        setStatus(`Nope, ${formatValue(hidden.fact)} is ${answer}.`, "bad");
      }

      // The old card fades out, the revealed card slides into its place, and a
      // fresh hidden card is dealt in. The slide is a FLIP: move the card to its
      // new slot first, then animate it from where it was.
      async function slideToNextCard() {
        const leaving = shown;
        if (!ctx.reducedMotion) {
          leaving.el.animate([{ opacity: 1 }, { opacity: 0, scale: "0.92" }], { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" });
          await wait(LEAVE_MS);
        }

        const before = hidden.el.getBoundingClientRect();
        shown = hidden;
        hidden = makeCard(drawFact(shown.fact.value), { hidden: true });
        shown.el.classList.remove("is-right");
        shown.mark.replaceChildren();
        leaving.el.remove();
        duel.append(hidden.el);
        placeCards();

        if (ctx.reducedMotion) return;
        const after = shown.el.getBoundingClientRect();
        shown.el.animate(
          [{ translate: `${before.left - after.left}px ${before.top - after.top}px` }, { translate: "0 0" }],
          { duration: SLIDE_MS, easing: EASE_OUT }
        );
        dealIn([hidden], DEAL_STAGGER_MS);
        await wait(SLIDE_MS);
      }

      function endRun() {
        resultScreen(ctx, {
          score: streak,
          display: String(streak),
          caption: "streak",
          message: verdict(streak),
          onAgain: play,
        });
      }

      /* ----- Little helpers ----- */

      // Resolves after `ms`, or never if the round ends first (ctx.reset clears the timer).
      function wait(ms) {
        return new Promise((resolve) => ctx.timeout(resolve, ms));
      }

      // The CSS grid puts each card in its slot, so swapping roles is just a label.
      function placeCards() {
        shown.el.dataset.slot = "shown";
        hidden.el.dataset.slot = "hidden";
      }

      function dealIn(cards, delayMs = 0) {
        if (ctx.reducedMotion) return;
        cards.forEach((card, i) => {
          card.el.animate(
            [{ opacity: 0, translate: "0 14px", scale: "0.96" }, { opacity: 1, translate: "0 0", scale: "1" }],
            { duration: SLIDE_MS, easing: EASE_OUT, delay: delayMs + i * DEAL_STAGGER_MS, fill: "backwards" }
          );
        });
      }

      // Locked buttons stay focusable (no `disabled`), so keyboard focus isn't
      // lost mid-turn; the chosen one stays marked while the answer comes in.
      function setButtonsLocked(locked, chosen = null) {
        controls.classList.toggle("is-locked", locked);
        for (const [direction, guessBtn] of Object.entries(buttons)) {
          guessBtn.setAttribute("aria-disabled", String(locked));
          guessBtn.classList.toggle("is-chosen", direction === chosen);
        }
      }

      function setStatus(text, tone = "") {
        status.textContent = text;
        status.dataset.tone = tone;
      }

      function popPlusOne() {
        if (ctx.reducedMotion) return;
        const plus = h("span", { class: "hl-plus", "aria-hidden": "true" }, "+1");
        streakStat.append(plus);
        ctx.timeout(() => plus.remove(), PLUS_ONE_MS);
      }

      /* ----- Input ----- */

      for (const [direction, guessBtn] of Object.entries(buttons)) {
        ctx.on(guessBtn, "click", () => guess(direction));
      }
      ctx.on(document, "keydown", (event) => {
        if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
        const direction = KEY_TO_GUESS[event.key?.toLowerCase()]; // autofill can fire keydown with no key
        if (!direction) return;
        event.preventDefault();
        guess(direction);
      });

      dealFirstPair();
    }
  },
};

/* ----- Building blocks ----- */

function guessButton(direction) {
  const { label, keys, arrowTurn } = GUESSES[direction];
  return button(
    [art("arrow", "↑", { className: "hl-arrow", rotate: arrowTurn }), label],
    null,
    { variant: "ghost", className: "g-btn--big hl-guess", "aria-keyshortcuts": keys }
  );
}

function keysHint() {
  const key = (name) => h("kbd", null, name);
  return h("p", { class: "hl-keys" }, key("↑"), " ", key("↓"), " or ", key("H"), " ", key("L"));
}

function makeCard(fact, { hidden = false } = {}) {
  const drawn = hasArt("card");
  const value = h("span", { class: "hl-card__value" });
  const mark = h("span", { class: "hl-card__mark", "aria-hidden": "true" });
  const el = h("div", { class: drawn ? "hl-card hl-card--drawn" : "hl-card", role: "group" },
    drawn ? art("card", "", { className: "hl-card__frame" }) : null,
    h("span", { class: "hl-card__label" }, fact.label),
    value,
    mark
  );
  const card = { el, fact, value, mark };

  if (hidden) {
    el.classList.add("is-hidden");
    el.setAttribute("aria-label", `${fact.label}: hidden`);
    setCardValue(card, "?");
  } else {
    turnOver(card);
    setCardValue(card, formatValue(fact));
  }
  return card;
}

function turnOver(card) {
  card.el.classList.remove("is-hidden");
  card.el.setAttribute("aria-label", `${card.fact.label}: ${formatValue(card.fact)}`);
}

// --len lets the CSS shrink long numbers so they always fit on one line.
// Short values (including "?") share one size, so size never hints at length.
function setCardValue(card, text, sizeForLength = text.length) {
  card.value.textContent = text;
  card.value.style.setProperty("--len", Math.max(sizeForLength, 4));
}

/* ----- Pure helpers ----- */

// Years and port numbers stay plain ("1998"); everything else gets separators.
function formatValue(fact, value = fact.value) {
  return fact.format === "plain" ? String(value) : formatNumber(value);
}

function verdict(streak) {
  if (streak === 0) return "The very first card got you. Rematch?";
  if (streak < 3) return "Just warming up.";
  if (streak < 6) return "Nice run.";
  if (streak < 10) return "Great instincts.";
  if (streak < 15) return "You really know your numbers.";
  return "A walking encyclopedia.";
}
