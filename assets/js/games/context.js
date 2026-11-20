// The `ctx` object handed to a game's mount(stage, ctx).
//
// Its main job is cleanup. Everything a game starts — event listeners, timers,
// animation loops — is registered with the current *round*. A round ends when:
//   - the game calls ctx.reset() (introScreen/resultScreen do this for you), or
//   - the player leaves the game (back to the menu, Back button, Escape).
// When a round ends, everything it registered is stopped. Games never have to
// remember to remove a listener or clear a timer.

import { getBest, loadData, saveData } from "./kit/storage.js";
import { prefersReducedMotion } from "./kit/util.js";

function newRound() {
  return { controller: new AbortController(), cleanups: [] };
}

function endRound(round) {
  round.controller.abort(); // removes every listener added with this round's signal
  for (const cleanup of round.cleanups.splice(0)) {
    try {
      cleanup();
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * @param game      the game's entry from data/games.js
 * @param stage     the element the game renders into
 * @param onBest    called with the slug after a new best is saved (to refresh the menu)
 */
export function createContext(game, stage, { onBest } = {}) {
  let round = newRound();
  const onLeave = [];
  const track = (cleanup) => {
    round.cleanups.push(cleanup);
    return cleanup;
  };

  return {
    game,
    slug: game.slug,
    stage,
    reducedMotion: prefersReducedMotion(),

    /** Abort signal for the current round, for APIs that accept one. */
    get signal() {
      return round.controller.signal;
    },

    /** End the current round and start a clean one. */
    reset() {
      endRound(round);
      round = newRound();
    },

    /** addEventListener that's removed automatically when the round ends. */
    on(target, type, handler, options = {}) {
      target.addEventListener(type, handler, { ...options, signal: round.controller.signal });
    },

    /** setTimeout that's cleared automatically. Returns the id (clearTimeout works too). */
    timeout(fn, ms) {
      const id = setTimeout(fn, ms);
      track(() => clearTimeout(id));
      return id;
    },

    /** setInterval that's cleared automatically. */
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      track(() => clearInterval(id));
      return id;
    },

    /**
     * Call fn(dtSeconds, now) on every animation frame until the round ends or
     * the returned stop() is called. dt is capped at 0.1s so coming back to a
     * background tab doesn't make the game jump ahead.
     */
    loop(fn) {
      let running = true;
      let frame = 0;
      let last = performance.now();

      const tick = (now) => {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        fn(dt, now);
        if (running) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
      return track(() => {
        running = false;
        cancelAnimationFrame(frame);
      });
    },

    /** Any other cleanup for this round (e.g. disconnecting a ResizeObserver). */
    onCleanup: track,

    /** Cleanup that should run only when the player leaves the game entirely. */
    onLeave(fn) {
      onLeave.push(fn);
    },

    getBest: () => getBest(game.slug),

    /**
     * Save `score` if it beats the stored best. Returns { isNewBest, best }.
     * A score of 0 in a "higher is better" game isn't worth remembering.
     */
    submitScore(score) {
      const best = getBest(game.slug);
      if (typeof score !== "number" || !Number.isFinite(score)) return { isNewBest: false, best };
      if (game.best.better === "high" && score <= 0) return { isNewBest: false, best };

      const beatsBest = best == null || (game.best.better === "low" ? score < best : score > best);
      if (!beatsBest) return { isNewBest: false, best };

      saveData(game.slug, { ...loadData(game.slug), best: score });
      onBest?.(game.slug);
      // The very first score is a best, but "New best!" only means something once there was one to beat.
      return { isNewBest: best != null, best: score };
    },

    /** Small per-game settings, stored next to the best score. */
    load: () => loadData(game.slug),
    save: (data) => saveData(game.slug, { ...loadData(game.slug), ...data }),

    /** Called by the arcade when the player leaves the game. */
    destroy() {
      endRound(round);
      for (const fn of onLeave.splice(0)) {
        try {
          fn();
        } catch (error) {
          console.error(error);
        }
      }
    },
  };
}
