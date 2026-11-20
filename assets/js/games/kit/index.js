// The game kit: everything a game needs, from one import.
//
//   import { h, button, statBar, introScreen, resultScreen, sfx } from "./kit/index.js";
//
// How a game is put together
// --------------------------
// A game is one file, assets/js/games/<slug>.js, that default-exports:
//
//   export default {
//     mount(stage, ctx) {
//       introScreen(ctx, { onStart: play });   // 1. how-to + Play
//
//       function play() {
//         ctx.reset();                          // 2. a fresh round
//         ...build the round into ctx.stage...
//         ...when it's over:
//         resultScreen(ctx, { score, display, onAgain: play });  // 3. result
//       }
//     },
//   };
//
// `stage` is the empty area inside the games card. `ctx` (see ../context.js)
// owns everything the round starts — listeners via ctx.on(), timers via
// ctx.timeout()/ctx.interval(), animation via ctx.loop() — and cleans it all
// up when the round ends or the player leaves the game.
//
// Styles for a game live in assets/css/games/<slug>.css, scoped under
// .game-stage--<slug>. Nothing in the kit touches the page at import time.

export { h, svg, focusSoon, restartAnimation } from "./dom.js";
export { randInt, pick, shuffle, clamp, formatNumber, prefersReducedMotion, isTouchDevice } from "./util.js";
export { loadData, saveData, getBest, formatBest } from "./storage.js";
export { tone, sfx, isSoundOn, setSoundOn } from "./sound.js";
export { art, hasArt, artSrc } from "./art.js";
export { onSwipe } from "./gestures.js";
export { button, statBar, streakFlame, lives, countdownBar, introScreen, resultScreen, flash } from "./ui.js";
