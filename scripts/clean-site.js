const fs = require("node:fs");
const path = require("node:path");

const outputDir = path.resolve(__dirname, "..", "_site");
const projectRoot = path.resolve(__dirname, "..");

// Guard against an incorrect path ever deleting files outside this project.
if (!outputDir.startsWith(projectRoot + path.sep)) {
  throw new Error("Refusing to clean a path outside the project.");
}

fs.rmSync(outputDir, { recursive: true, force: true });
