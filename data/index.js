const siteContent = require("./site.js");

// Eleventy receives one object, while editable content stays in focused files.
module.exports = {
  ...siteContent,
  work: require("./work.js"),
  skills: require("./skills.js"),
  projects: require("./projects.js")
};
