// Reaction Time
//
// The pad sits in a calm state for a random 1.3–3.8 seconds, then turns green.
// The player taps as soon as it does; we time the gap. Five rounds, and the
// score is the average (lower is better). Tapping before green is "too soon"
// and that round starts over.
//
// The pad moves through these states:
//
//   idle ──tap──▶ waiting ──(random delay)──▶ go ──tap──▶ shown ──tap──▶ waiting …
//                    │
//                    └──tap (too early)──▶ early ──tap──▶ waiting
//
// This is the reference game: it shows the intended shape of every game file.

import { h, art, statBar, introScreen, resultScreen, sfx, flash, randInt } from "./kit/index.js";

const ROUNDS = 5;
const MIN_WAIT_MS = 1300;
const MAX_WAIT_MS = 3800;

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      const times = [];
      let state = "idle";
      let turnedGreenAt = 0;
      let greenTimer = 0;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "round", label: "Round", value: `1/${ROUNDS}` },
        { key: "last", label: "Last", value: "—" },
        { key: "average", label: "Average", value: "—" },
      ]);
      const label = h("span", { class: "rt-label" });
      const hint = h("span", { class: "rt-hint" });
      const pad = h("button", { type: "button", class: "rt-pad", "aria-live": "assertive" },
        art("bolt", "ϟ", { className: "rt-icon" }),
        label,
        hint
      );
      stage.replaceChildren(h("div", { class: "rt" }, stats.el, pad));
      pad.focus({ preventScroll: true });

      /* ----- State changes ----- */

      function show(nextState, text, hintText = "") {
        state = nextState;
        pad.dataset.state = nextState;
        label.textContent = text;
        hint.textContent = hintText;
      }

      function startWaiting() {
        show("waiting", "Wait for green…", "Tap the moment it changes.");
        greenTimer = ctx.timeout(() => {
          turnedGreenAt = performance.now();
          show("go", "Tap!");
          sfx.tick();
        }, randInt(MIN_WAIT_MS, MAX_WAIT_MS));
      }

      function tappedTooSoon() {
        clearTimeout(greenTimer);
        sfx.bad();
        flash(pad, "bad");
        show("early", "Too soon!", "Tap to try that round again.");
      }

      function recordReaction() {
        const ms = Math.round(performance.now() - turnedGreenAt);
        times.push(ms);
        const average = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);

        stats.set("last", `${ms} ms`);
        stats.set("average", `${average} ms`);
        sfx.good();

        if (times.length < ROUNDS) {
          show("shown", `${ms} ms`, "Tap for the next round.");
          return;
        }

        // Last round: let the time sink in for a moment before the result.
        show("shown", `${ms} ms`);
        ctx.timeout(() => {
          resultScreen(ctx, {
            score: average,
            display: `${average} ms`,
            caption: "average reaction time",
            message: verdict(average),
            onAgain: play,
          });
        }, 650);
      }

      function nextRound() {
        stats.set("round", `${times.length + 1}/${ROUNDS}`);
        startWaiting();
      }

      /* ----- Input ----- */

      // What a tap means depends on the pad's state.
      function onTap() {
        if (state === "waiting") tappedTooSoon();
        else if (state === "go") recordReaction();
        else if (state === "shown" && times.length < ROUNDS) nextRound();
        else if (state === "idle" || state === "early") startWaiting();
      }

      // pointerdown rather than click: click fires on release, which would add
      // ~100ms to every measured time.
      ctx.on(pad, "pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        onTap();
      });
      ctx.on(document, "keydown", (event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          onTap();
        }
      });

      show("idle", "Tap to start", "Five rounds. Don't jump the gun.");
    }
  },
};

function verdict(ms) {
  if (ms < 200) return "Lightning. Are you a robot?";
  if (ms < 250) return "Very quick hands.";
  if (ms < 300) return "Solid reflexes.";
  if (ms < 380) return "Not bad at all.";
  return "Maybe grab a coffee and go again?";
}
