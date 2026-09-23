const siteContent = require("./site.js");
const work = require("./work.js");

// Eleventy receives one object, while editable content stays in focused files.
module.exports = {
  ...siteContent,
  work,
  workDetails: work.filter((role) => role.readMore),
  projects: require("./projects.js")
};
