const vscode = require("vscode");
const { setCharaFolder } = require("../workflow/settings");
const { info, warn } = require("../workflow/output");

async function run(context) {
  const result = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: "Select Chara Folder"
  });

  if (!result || result.length === 0) {
    warn("No Chara folder selected.");
    return;
  }

  const folderPath = result[0].fsPath;
  await setCharaFolder(context, folderPath);
  await vscode.commands.executeCommand("bbscript.refreshColEditors");
  info(`Chara folder set: ${folderPath}`);
}

module.exports = { run };
