const { getProjectFolder } = require("../workflow/settings");
const { deployPackage } = require("../workflow/runtime");
const { warn } = require("../workflow/output");

async function run(context) {
  const projectRoot = getProjectFolder(context);

  if (!projectRoot) {
    warn("No BBScript project selected.");
    return;
  }

  await deployPackage(context, projectRoot);
}

module.exports = { run };