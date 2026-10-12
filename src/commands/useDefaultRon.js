const { clearRonOverride } = require("../workflow/settings");
const { info } = require("../workflow/output");

async function run(context) {
  await clearRonOverride(context);
  info("Using bundled default.ron");
}

module.exports = { run };