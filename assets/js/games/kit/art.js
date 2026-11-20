// Renders the owner's hand-drawn art (registered in ../art.js) with a text
// stand-in until a drawing exists. Games ask for art by name and never need to
// change when a drawing is added.

import { art as drawings } from "../art.js";
import { h } from "./dom.js";

/**
 * The drawing for `name`, or `fallback` text if none has been added yet.
 *
 *   art("fire", "▲")
 *   art("arrow", "↑", { rotate: 180 })        // same drawing, pointing down
 *
 * Drawings get the site's `drawing` class, so they flip colour in dark mode
 * like every other drawing on the site.
 */
export function art(name, fallback, { className = "", alt = "", rotate = 0 } = {}) {
  const src = drawings[name];
  const style = rotate ? { rotate: `${rotate}deg` } : undefined;

  if (src) {
    return h("img", {
      class: `g-art g-art--img drawing ${className}`.trim(),
      src,
      alt,
      "aria-hidden": alt ? null : "true",
      draggable: "false",
      decoding: "async",
      style,
    });
  }

  return h("span", { class: `g-art g-art--text ${className}`.trim(), "aria-hidden": "true", style }, fallback);
}

/** True once a drawing has been added for `name` (for canvas games that draw it themselves). */
export const hasArt = (name) => Boolean(drawings[name]);

/** The image path for `name`, or null. */
export const artSrc = (name) => drawings[name] || null;
