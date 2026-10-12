const vscode = require("vscode");
const { setModFolder } = require("../workflow/settings");
const { info, warn } = require("../workflow/output");

async function run(context) {
  const result = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: "Select Mod Folder"
  });

  if (!result || result.length === 0) {
    warn("No mod folder selected.");
    return;
  }

  const folderPath = result[0].fsPath;
  await setModFolder(context, folderPath);
  info(`Mod folder set: ${folderPath}`);
}

module.exports = { run };
