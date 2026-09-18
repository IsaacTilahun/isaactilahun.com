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
