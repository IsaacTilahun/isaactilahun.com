const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const siteContent = require("../data");

const projectRoot = path.resolve(__dirname, "..");
const layout = fs.readFileSync(path.join(projectRoot, "_includes/layouts/base.njk"), "utf8");
const mainScript = fs.readFileSync(path.join(projectRoot, "assets/js/main.js"), "utf8");

test("page startup falls back to system colors when storage access is denied", () => {
  const inlineScript = layout.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];
  const document = { documentElement: { dataset: {} } };
  const localStorage = {
    getItem() {
      throw new Error("Storage access denied");
    }
  };

  assert.doesNotThrow(() => vm.runInNewContext(inlineScript, { document, localStorage }));
  assert.deepEqual(document.documentElement.dataset, {});
});

test("page startup ignores unrecognized saved theme values", () => {
  const inlineScript = layout.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];
  const document = { documentElement: { dataset: {} } };
  const localStorage = { getItem: () => "ultraviolet" };

  vm.runInNewContext(inlineScript, { document, localStorage });
  assert.deepEqual(document.documentElement.dataset, {});
});

test("theme switching updates the page and icon when storage writes are denied", () => {
  const listeners = {};
  const attributes = {};
  const themeImage = {
    dataset: { darkSrc: "dark.svg", lightSrc: "light.svg" }
  };
  const themeToggle = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setAttribute(name, value) {
      attributes[name] = value;
    }
  };
  const root = { dataset: {} };
  const document = {
    documentElement: root,
    startViewTransition: undefined,
    querySelector(selector) {
      if (selector === ".theme-toggle") return themeToggle;
      if (selector === ".theme-toggle__image") return themeImage;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const window = {
    matchMedia() {
      return { matches: false };
    }
  };
  const localStorage = {
    setItem() {
      throw new Error("Storage access denied");
    }
  };

  vm.runInNewContext(mainScript, { document, window, localStorage });
  assert.equal(typeof listeners.click, "function");
  assert.doesNotThrow(() => listeners.click());
  assert.equal(root.dataset.theme, "dark");
  assert.equal(themeImage.src, "light.svg");
  assert.equal(attributes["aria-label"], "Switch to light mode");
});

test("all asset paths in site data resolve to files", () => {
  const assetPaths = new Set();
  const collect = (value) => {
    if (typeof value === "string" && value.startsWith("/assets/")) {
      assetPaths.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };

  collect(siteContent);
  const missing = [...assetPaths].filter((assetPath) =>
    !fs.existsSync(path.join(projectRoot, assetPath.slice(1)))
  );

  assert.deepEqual(missing, []);
});

test("only projects with a Read More action are assigned detail pages", () => {
  const expected = siteContent.projects.filter((project) =>
    project.actions.some((action) => action.type === "readMore")
  );

  assert.deepEqual(siteContent.projectDetails, expected);
  assert.deepEqual(
    siteContent.projectDetails.map((project) => project.slug),
    ["mysh", "paint-app"]
  );
});
