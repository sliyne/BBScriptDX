const vscode = require("vscode");
const { setSigSource } = require("../workflow/settings");
const { info, warn } = require("../workflow/output");

async function run(context) {
  const result = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    openLabel: "Select Signature Source",
    filters: {
      "Signature Files": ["sig"],
      "All Files": ["*"]
    }
  });

  if (!result || result.length === 0) {
    warn("No signature source selected.");
    return;
  }

  const filePath = result[0].fsPath;
  await setSigSource(context, filePath);
  info(`Signature source set: ${filePath}`);
}

module.exports = { run };