const path = require("node:path");

const dataDirectory = path.join(__dirname, "data");

// Reload editable data modules on every build instead of using Node's cache.
function loadSiteContent() {
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.startsWith(dataDirectory + path.sep)) {
      delete require.cache[modulePath];
    }
  }

  return require("./data");
}

module.exports = function (eleventyConfig) {
  // Combine the data folder and expose it to templates as `siteContent`.
  eleventyConfig.addGlobalData("siteContent", loadSiteContent);
  eleventyConfig.addWatchTarget("./data/");

  // README is documentation, not a website page. Assets are copied unchanged.
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.addPassthroughCopy("assets");

  // Templates use this to decide whether a link should open in a new tab.
  eleventyConfig.addFilter("isExternal", function (url) {
    return /^https?:\/\//.test(url);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    // Source templates live at the project root and build into _site/.
    htmlTemplateEngine: "njk",
    templateFormats: ["njk"]
  };
};
