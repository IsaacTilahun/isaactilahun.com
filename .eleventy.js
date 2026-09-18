module.exports = function (eleventyConfig) {
  // Combine the data folder and expose it to templates as `siteContent`.
  eleventyConfig.addGlobalData("siteContent", require("./data"));

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
