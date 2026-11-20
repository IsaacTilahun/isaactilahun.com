// Touch gestures.

/**
 * Report quick swipes on an element as "up" | "down" | "left" | "right".
 *
 * Mouse drags are ignored (desktop players use the keyboard). After a swipe
 * fires, tracking restarts from the current finger position, so one
 * continuous L-shaped stroke can turn twice without lifting the finger.
 *
 * Pass the round's ctx.signal so the listeners go away with the round.
 */
export function onSwipe(el, onDirection, signal, { threshold = 22 } = {}) {
  let tracking = false;
  let startX = 0;
  let startY = 0;

  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  }, { signal });

  el.addEventListener("pointermove", (event) => {
    if (!tracking) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    const horizontal = Math.abs(dx) > Math.abs(dy);
    onDirection(horizontal ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));

    // Keep following the same finger from here for the next turn.
    startX = event.clientX;
    startY = event.clientY;
  }, { signal });

  const stop = () => { tracking = false; };
  el.addEventListener("pointerup", stop, { signal });
  el.addEventListener("pointercancel", stop, { signal });
}
