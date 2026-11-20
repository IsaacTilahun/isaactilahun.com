// Small, pure helpers shared by the games: randomness, numbers, and a couple
// of questions about the visitor's device.

/** Whole number from min to max, both included. */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** One random item from a list. */
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** A shuffled copy of a list (Fisher–Yates); the original is left alone. */
export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 1234567 -> "1,234,567" */
export const formatNumber = (value) => Number(value).toLocaleString("en-US");

/** The visitor asked their OS for less motion: skip or shorten animations. */
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Phones and tablets: no hovering mouse, a finger instead. */
export const isTouchDevice = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches;
