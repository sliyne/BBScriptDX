const { selectProjectFolder } = require("../workflow/project");

async function run(context) {
  await selectProjectFolder(context);
}

module.exports = { run };
