const { getProjectFolder } = require("../workflow/settings");
const { rebuildAndPackage } = require("../workflow/runtime");
const { warn } = require("../workflow/output");

async function run(context) {
  const projectRoot = getProjectFolder(context);

  if (!projectRoot) {
    warn("No BBScript project selected.");
    return;
  }

  await rebuildAndPackage(context, projectRoot);
}

module.exports = { run };