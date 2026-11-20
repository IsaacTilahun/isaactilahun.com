// DOM helpers. Games build their UI with h() instead of HTML strings, so
// nothing is ever injected unescaped and the markup reads top to bottom.

/**
 * Create an element.
 *
 *   h("button", { class: "g-btn", onClick: start }, "Play")
 *
 * - `class`, `text`, `style` (an object) and `dataset` (an object) are special.
 * - Any `onSomething` function becomes an event listener ("onClick" -> "click").
 * - `true` becomes an empty attribute; `null`, `undefined` and `false` are skipped.
 * - Children can be strings, numbers, nodes, arrays, or null (skipped).
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;

    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }

  return el;
}

/**
 * Like h(), for SVG elements, which need their own namespace. Attributes are
 * set as-is; `null` and `undefined` are skipped.
 *
 *   svg("svg", { viewBox: "0 0 24 24" }, svg("path", { d: "M0 0L24 24" }))
 */
export function svg(tag, attributes = {}, ...children) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value != null) el.setAttribute(key, String(value));
  }
  el.append(...children);
  return el;
}

/** Re-trigger a one-shot CSS animation class, even if it's already applied. */
export function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // force a reflow so the browser sees the class as new
  el.classList.add(className);
}

/**
 * Focus an element on the next frame. Needed right after swapping screens,
 * because the new element isn't focusable until it's actually in the page.
 */
export function focusSoon(el) {
  requestAnimationFrame(() => {
    if (el && el.isConnected) el.focus({ preventScroll: true });
  });
}
