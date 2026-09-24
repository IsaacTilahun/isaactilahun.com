const siteContent = require("./site.js");
const work = require("./work.js");
const projects = require("./projects.js");

// Eleventy receives one object, while editable content stays in focused files.
module.exports = {
  ...siteContent,
  work,
  workDetails: work.filter((role) => role.readMore),
  projects,
  projectDetails: projects.filter((project) =>
    project.actions.some((action) => action.type === "readMore")
  )
};
