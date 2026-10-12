const { getProjectFolder } = require("../workflow/settings");
const { discoverAssets } = require("../workflow/discovery");
const { log, show, warn, info } = require("../workflow/output");

async function run(context) {
  const projectRoot = getProjectFolder(context);

  if (!projectRoot) {
    warn("No BBScript project selected.");
    return;
  }

  const result = discoverAssets(projectRoot);

  show();
  log("=== BBScript Asset Discovery ===");
  log(`Project: ${projectRoot}`);
  log(`Valid assets: ${result.validAssets.length}`);
  log(`Missing pairs: ${result.missingPairs.length}`);
  log("");

  if (result.validAssets.length > 0) {
    log("Valid assets:");
    for (const asset of result.validAssets) {
      log(`- [${asset.sourceType}] ${asset.sourceUasset}`);
      log(`    -> ${asset.outputFile}`);
    }
    log("");
  }

  if (result.missingPairs.length > 0) {
    log("Missing .uexp pairs:");
    for (const missing of result.missingPairs) {
      log(`- ${missing.sourceUasset}`);
      log(`    missing: ${missing.expectedUexp}`);
      log(`    would output: ${missing.outputFile}`);
    }
    log("");
  }

  info(
    `Asset discovery complete. Valid: ${result.validAssets.length}, Missing: ${result.missingPairs.length}`
  );
}

module.exports = { run };