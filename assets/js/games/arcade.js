// The Games page: a shelf of banner cards, one per game. Clicking a banner
// grows the game card out of it (a modal <dialog>); the back arrow, the
// browser's Back button, Escape, or a click outside the card shrinks it back.
// On phones the game card fills the screen.
//
// The address bar mirrors the open game (/games/#snake), so a game can be
// linked to directly and the Back button behaves.
//
// Each game is loaded only when it's opened: assets/js/games/<slug>.js plus
// its stylesheet assets/css/games/<slug>.css.

import { createContext } from "./context.js";
import { getBest, formatBest, isSoundOn, setSoundOn, prefersReducedMotion } from "./kit/index.js";

const games = JSON.parse(document.getElementById("games-data").textContent);
const gamesBySlug = new Map(games.map((game) => [game.slug, game]));

const menu = document.querySelector("[data-game-menu]");
const arcade = document.querySelector("[data-arcade]");
const card = arcade.querySelector("[data-arcade-card]");
const title = arcade.querySelector("[data-arcade-title]");
const backButton = arcade.querySelector("[data-arcade-back]");
const soundButton = arcade.querySelector("[data-arcade-sound]");
const stage = arcade.querySelector("[data-game-stage]");

// What's open right now. `openId` increases on every open/close so a game that
// finishes loading after the player already left doesn't mount itself.
let current = null; // { game, ctx, banner }
let openId = 0;
let leaving = false;

/* ---------- Banners ---------- */

function showBest(slug) {
  const label = menu.querySelector(`[data-best-for="${slug}"]`);
  const game = gamesBySlug.get(slug);
  if (!label || !game) return;
  const best = getBest(slug);
  label.textContent = best == null ? "" : formatBest(game.best.format, best);
}

games.forEach((game) => showBest(game.slug));

menu.addEventListener("click", (event) => {
  const banner = event.target.closest("[data-game]");
  if (banner) openGame(banner.dataset.game, { addHistory: true });
});

/* ---------- Sound switch ---------- */

function showSoundState() {
  const on = isSoundOn();
  soundButton.setAttribute("aria-pressed", String(on));
  soundButton.setAttribute("aria-label", on ? "Sound on" : "Sound off");
  soundButton.classList.toggle("is-on", on);
}

soundButton.addEventListener("click", () => {
  setSoundOn(!isSoundOn());
  showSoundState();
});
showSoundState();

/* ---------- Opening a game ---------- */

async function openGame(slug, { addHistory }) {
  const game = gamesBySlug.get(slug);
  if (!game || current || leaving) return;

  const id = ++openId;
  const banner = menu.querySelector(`[data-game="${slug}"]`);
  const ctx = createContext(game, stage, { onBest: showBest });
  current = { game, ctx, banner };

  if (addHistory) history.pushState({ game: slug }, "", `#${slug}`);

  title.textContent = game.title;
  stage.className = `arcade__stage game-stage--${slug}`;
  stage.replaceChildren();

  document.documentElement.classList.add("arcade-open");
  arcade.showModal();
  card.focus({ preventScroll: true }); // the card, not its first button: no stray focus ring
  growFrom(banner);

  try {
    const [module] = await Promise.all([import(`./${slug}.js`), loadStylesheet(slug)]);
    if (id !== openId) return; // the player left while it was loading
    module.default.mount(stage, ctx);
  } catch (error) {
    console.error(error);
    if (id === openId) showLoadError();
  }
}

/** Each game's CSS is added once, the first time the game is opened. */
const stylesheets = new Map();

function loadStylesheet(slug) {
  if (!stylesheets.has(slug)) {
    stylesheets.set(slug, new Promise((resolve) => {
      const link = Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: `/assets/css/games/${slug}.css`,
        onload: resolve,
        onerror: resolve, // a game without its own CSS still runs
      });
      document.head.append(link);
      setTimeout(resolve, 2500); // never hold the game hostage to a slow stylesheet
    }));
  }
  return stylesheets.get(slug);
}

function showLoadError() {
  const message = document.createElement("p");
  message.className = "arcade__error";
  message.textContent = "This game didn't load. Try again in a moment.";
  stage.replaceChildren(message);
}

/* ---------- Leaving a game ---------- */

async function leaveGame() {
  if (!current || leaving) return;
  leaving = true;
  openId++;

  const { ctx, banner } = current;
  ctx.destroy(); // stops everything the game started
  current = null;

  await shrinkInto(banner);
  arcade.close();
  card.getAnimations().forEach((animation) => animation.cancel());
  arcade.classList.remove("is-leaving");
  document.documentElement.classList.remove("arcade-open");
  stage.replaceChildren();

  banner?.focus({ preventScroll: true });
  leaving = false;
}

/**
 * Leave through the browser history when we added an entry for this game, so
 * the back arrow and the browser's Back button always agree.
 */
function requestLeave() {
  if (!current || leaving) return;
  if (history.state?.game) history.back();
  else leaveGame();
}

backButton.addEventListener("click", requestLeave);

// Escape: the dialog fires "cancel"; we animate out instead of snapping shut.
arcade.addEventListener("cancel", (event) => {
  event.preventDefault();
  requestLeave();
});

// A click on the dimmed page around the card (the dialog's backdrop).
arcade.addEventListener("click", (event) => {
  if (event.target === arcade) requestLeave();
});

/* ---------- Address bar and Back button ---------- */

const slugFromHash = () => decodeURIComponent(location.hash.slice(1));

window.addEventListener("popstate", () => {
  const slug = slugFromHash();
  if (current && current.game.slug !== slug) leaveGame();
  else if (!current && gamesBySlug.has(slug)) openGame(slug, { addHistory: false });
});

/* ---------- Growing out of / back into the banner ---------- */

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

/** The transform that makes the card (at `to`) sit exactly over `from`. */
function transformOnto(from, to) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
    `scale(${from.width / to.width}, ${from.height / to.height})`;
}

const isOnScreen = (box) => box.bottom > 0 && box.top < window.innerHeight;

function growFrom(banner) {
  if (prefersReducedMotion()) return;
  const to = card.getBoundingClientRect();
  const from = banner?.getBoundingClientRect();
  card.style.transformOrigin = "top left";

  const start = from && isOnScreen(from)
    ? { transform: transformOnto(from, to), opacity: 0.4 }
    : { transform: "translateY(16px) scale(0.97)", opacity: 0 };
  card.animate([start, { transform: "none", opacity: 1 }], { duration: 380, easing: EASE_OUT });

  // The contents fade in once the card has mostly grown, so text isn't seen stretched.
  for (const part of card.children) {
    part.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
  }
}

function shrinkInto(banner) {
  if (prefersReducedMotion()) return Promise.resolve();
  const from = card.getBoundingClientRect();
  const to = banner?.getBoundingClientRect();
  card.style.transformOrigin = "top left";
  arcade.classList.add("is-leaving"); // fades the backdrop

  const end = to && isOnScreen(to)
    ? { transform: transformOnto(to, from), opacity: 0.3 }
    : { transform: "translateY(16px) scale(0.97)", opacity: 0 };
  // fill: "forwards" holds the last frame until the dialog has closed, so the
  // card doesn't flash back to full size for a frame.
  return card
    .animate([{ transform: "none", opacity: 1 }, end], { duration: 260, easing: EASE_IN, fill: "forwards" })
    .finished.catch(() => {});
}

/* ---------- Opening straight into a game (/games/#snake) ---------- */

// Runs last, once everything above exists.
{
  const slug = slugFromHash();
  if (gamesBySlug.has(slug)) {
    // Put the plain page underneath, so Back returns to it instead of leaving the site.
    history.replaceState(null, "", location.pathname);
    history.pushState({ game: slug }, "", `#${slug}`);
    openGame(slug, { addHistory: false });
  }
}
