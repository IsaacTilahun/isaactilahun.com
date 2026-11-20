// Saved data per game, kept in the visitor's own browser (localStorage).
// Storage can be unavailable (private mode, blocked cookies), so every access
// is wrapped: the games still work, scores just aren't remembered.

import { formatNumber } from "./util.js";

const keyFor = (slug) => `games:${slug}`;

export function loadData(slug) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(slug))) || {};
  } catch {
    return {};
  }
}

export function saveData(slug, data) {
  try {
    localStorage.setItem(keyFor(slug), JSON.stringify(data));
  } catch {
    // Nothing to do: the score just won't persist.
  }
}

/** The saved best score for a game, or null if there isn't one yet. */
export function getBest(slug) {
  const best = loadData(slug).best;
  return typeof best === "number" && Number.isFinite(best) ? best : null;
}

/** Fill a format such as "Best {value} ms" from data/games.js. */
export const formatBest = (format, value) => format.replace("{value}", formatNumber(value));
