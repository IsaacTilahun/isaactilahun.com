const themeToggle = document.querySelector(".theme-toggle");
const themeImage = document.querySelector(".theme-toggle__image");
const root = document.documentElement;

// Use the visitor's operating-system preference until they choose a theme.
function preferredTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function currentTheme() {
  return root.dataset.theme || preferredTheme();
}

// The drawing shows the theme that clicking the button will switch to.
function updateToggle() {
  const theme = currentTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  themeImage.src = nextTheme === "dark"
    ? themeImage.dataset.darkSrc
    : themeImage.dataset.lightSrc;
  themeImage.dataset.mode = nextTheme;
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
}

if (themeToggle) {
  updateToggle();

  themeToggle.addEventListener("click", () => {
    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    const applyTheme = () => {
      root.dataset.theme = nextTheme;
      localStorage.setItem("theme", nextTheme);
      updateToggle();
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // View Transitions provide the crossfade; older browsers switch normally.
    if (document.startViewTransition && !reduceMotion) {
      document.startViewTransition(applyTheme);
    } else {
      applyTheme();
    }
  });
}

// The Home arrows swap between Reach Out and My Skills in the same space.
const homePanels = [...document.querySelectorAll("[data-home-panel]")];
let activeHomePanel = 0;

document.querySelectorAll("[data-panel-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = Number(button.dataset.panelDirection);
    homePanels[activeHomePanel].hidden = true;
    activeHomePanel = (activeHomePanel + direction + homePanels.length) % homePanels.length;

    const nextPanel = homePanels[activeHomePanel];
    nextPanel.classList.remove("swipe-left", "swipe-right");
    nextPanel.classList.add(direction > 0 ? "swipe-right" : "swipe-left");
    nextPanel.hidden = false;
  });
});

// Open the journal as a modal reading view; the native dialog blocks the page.
const journalDialog = document.querySelector("[data-journal-dialog]");
const openJournal = document.querySelector("[data-journal-open]");
const closeJournal = document.querySelector("[data-journal-close]");

if (journalDialog && openJournal && closeJournal) {
  openJournal.addEventListener("click", () => {
    journalDialog.classList.remove("is-closing");
    journalDialog.showModal();
    journalDialog.focus();
  });

  function closeJournalModal() {
    if (!journalDialog.open || journalDialog.classList.contains("is-closing")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      journalDialog.close();
      return;
    }
    journalDialog.classList.add("is-closing");
    setTimeout(() => {
      journalDialog.close();
      journalDialog.classList.remove("is-closing");
    }, 160);
  }

  closeJournal.addEventListener("click", closeJournalModal);
  journalDialog.addEventListener("click", (event) => {
    if (event.target === journalDialog) closeJournalModal();
  });
  journalDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeJournalModal();
  });
}

// Project cards sway very slightly from their top edge, like pinned artwork.
const canSway = window.matchMedia("(hover: hover) and (pointer: fine)").matches
  && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canSway) {
  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const distanceFromCenter = (event.clientX - bounds.left) / bounds.width - 0.5;
      card.style.setProperty("--card-tilt", `${distanceFromCenter * 1.4}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--card-tilt");
    });
  });
}

// Grab the footer smiley, throw it, and let it bounce around the viewport.
const smiley = document.querySelector(".footer-drawing");

if (smiley) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0;
  let y = 0;
  let velocityX = 0;
  let velocityY = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerTime = 0;
  let dragging = false;
  let animationFrame;

  function keepInsideViewport() {
    x = Math.max(0, Math.min(x, window.innerWidth - smiley.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - smiley.offsetHeight));
  }

  function drawSmiley() {
    smiley.style.left = `${x}px`;
    smiley.style.top = `${y}px`;
  }

  function bounce() {
    const maxX = window.innerWidth - smiley.offsetWidth;
    const maxY = window.innerHeight - smiley.offsetHeight;

    velocityY += 0.20;
    velocityX *= 0.995;
    x += velocityX;
    y += velocityY;

    if (x <= 0 || x >= maxX) {
      x = Math.max(0, Math.min(x, maxX));
      velocityX *= -0.78;
    }
    if (y <= 0 || y >= maxY) {
      y = Math.max(0, Math.min(y, maxY));
      velocityY *= -0.72;
      if (y === maxY) velocityX *= 0.94;
    }

    drawSmiley();

    const hasSettled = y === maxY
      && Math.abs(velocityX) < 0.08
      && Math.abs(velocityY) < 0.7;
    if (!hasSettled) animationFrame = requestAnimationFrame(bounce);
  }

  smiley.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);

    const bounds = smiley.getBoundingClientRect();
    x = bounds.left;
    y = bounds.top;
    velocityX = 0;
    velocityY = 0;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = performance.now();
    dragging = true;

    smiley.classList.add("is-loose", "is-dragging");
    smiley.style.position = "fixed";
    smiley.setPointerCapture(event.pointerId);
    drawSmiley();
  });

  smiley.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const now = performance.now();
    const elapsed = Math.max(now - lastPointerTime, 8);
    const movedX = event.clientX - lastPointerX;
    const movedY = event.clientY - lastPointerY;

    x += movedX;
    y += movedY;
    velocityX = Math.max(-28, Math.min(28, movedX / elapsed * 16));
    velocityY = Math.max(-28, Math.min(28, movedY / elapsed * 16));
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = now;

    keepInsideViewport();
    drawSmiley();
  });

  function releaseSmiley(event) {
    if (!dragging) return;
    dragging = false;
    smiley.classList.remove("is-dragging");
    if (smiley.hasPointerCapture(event.pointerId)) {
      smiley.releasePointerCapture(event.pointerId);
    }
    if (!reduceMotion) animationFrame = requestAnimationFrame(bounce);
  }

  smiley.addEventListener("pointerup", releaseSmiley);
  smiley.addEventListener("pointercancel", releaseSmiley);
  window.addEventListener("resize", () => {
    if (!smiley.classList.contains("is-loose")) return;
    keepInsideViewport();
    drawSmiley();
  });
}
