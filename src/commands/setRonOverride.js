const vscode = require("vscode");
const { setRonOverride } = require("../workflow/settings");
const { info } = require("../workflow/output");

async function run(context) {
  const result = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      Ron: ["ron"],
      All: ["*"]
    },
    openLabel: "Select .ron Override"
  });

  if (!result || result.length === 0) return;

  const file = result[0].fsPath;
  await setRonOverride(context, file);
  info(`.ron override set: ${file}`);
}

module.exports = { run };