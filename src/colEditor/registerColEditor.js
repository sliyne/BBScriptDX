const vscode = require("vscode");
const { ColCustomEditorProvider } = require("./ColCustomEditorProvider");

function registerColEditor(context) {
  const provider = new ColCustomEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      ColCustomEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.refreshColEditors", () => {
      provider.refreshCharaFolders();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.openColSprite", async (resource, spriteName) => {
      await provider.openSprite(resource, spriteName);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.openColEditor", async (resource) => {
      let target = resource;

      if (!target) {
        target = vscode.window.activeTextEditor?.document?.uri;
      }

      if (!target) {
        vscode.window.showWarningMessage("Open a COL_*.json file first.");
        return;
      }

      const fileName = target.path.split("/").pop() || target.fsPath;
      if (!/^COL_.*\.json$/i.test(fileName)) {
        vscode.window.showWarningMessage("The selected file is not a COL_*.json file.");
        return;
      }

      await vscode.commands.executeCommand(
        "vscode.openWith",
        target,
        ColCustomEditorProvider.viewType
      );
    })
  );
}

module.exports = {
  registerColEditor,
};
