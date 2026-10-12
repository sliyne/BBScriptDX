const vscode = require("vscode");
const path = require("path");
const {
  getProjectFolder,
  getModFolder,
  getCharaFolder,
  getSigSource,
  getRonOverride,
  getOverwriteRebuild,
  getOverwritePackage,
  getOverwriteDeploy,
  getOverwriteRebuildPackage,
  getOverwriteFullDeploy,
  setOverwriteRebuild,
  setOverwritePackage,
  setOverwriteDeploy,
  setOverwriteRebuildPackage,
  setOverwriteFullDeploy
} = require("../workflow/settings");
const { loadProjectConfig } = require("../workflow/project");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

class SidebarViewProvider {
  constructor(extensionUri, context) {
    this.extensionUri = extensionUri;
    this.context = context;
    this.view = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.command) {
          case "bbscript.selectProjectFolder":
          case "bbscript.setModFolder":
          case "bbscript.setCharaFolder":
          case "bbscript.setSigSource":
          case "bbscript.setRonOverride":
          case "bbscript.useDefaultRon":
          case "bbscript.extractParse":
          case "bbscript.rebuildReinject":
          case "bbscript.package":
          case "bbscript.deploy":
          case "bbscript.rebuildPackage":
          case "bbscript.fullDeploy":
          case "bbscript.reformatFiles":
            await vscode.commands.executeCommand(message.command);
            this.refresh();
            break;

          case "bbscript.toggleCustomRon":
            if (message.enabled) {
              await vscode.commands.executeCommand("bbscript.setRonOverride");
            } else {
              await vscode.commands.executeCommand("bbscript.useDefaultRon");
            }
            this.refresh();
            break;

          case "bbscript.refreshSidebar":
            this.refresh();
            break;
            
          case "bbscript.setCheckboxState":
            switch (message.key) {
              case "overwriteRebuild":
                await setOverwriteRebuild(this.context, message.value);
                break;
              case "overwritePackage":
                await setOverwritePackage(this.context, message.value);
                break;
              case "overwriteDeploy":
                await setOverwriteDeploy(this.context, message.value);
                break;
              case "overwriteRebuildPackage":
                await setOverwriteRebuildPackage(this.context, message.value);
                break;
              case "overwriteFullDeploy":
                await setOverwriteFullDeploy(this.context, message.value);
                break;
            }
            break;

        }
      } catch (err) {
        vscode.window.showErrorMessage(`BBScript sidebar action failed: ${err.message}`);
      }
    });
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = this.getHtml();
    }
  }

  getHtml() {
    const projectRoot = getProjectFolder(this.context);
    const modFolder = getModFolder(this.context);
    const charaFolder = getCharaFolder(this.context);
    const sigSource = getSigSource(this.context);
    const ronOverride = getRonOverride(this.context);
    const overwriteRebuild = getOverwriteRebuild(this.context);
    const overwritePackage = getOverwritePackage(this.context);
    const overwriteDeploy = getOverwriteDeploy(this.context);
    const overwriteRebuildPackage = getOverwriteRebuildPackage(this.context);
    const overwriteFullDeploy = getOverwriteFullDeploy(this.context);

    let projectConfig = null;
    if (projectRoot) {
      try {
        projectConfig = loadProjectConfig(projectRoot);
      } catch {
        projectConfig = null;
      }
    }

    const projectName =
      projectConfig?.projectName ||
      (projectRoot ? path.basename(projectRoot) : "(not set)");

    const missingProject = !projectRoot;
    const missingModFolder = !modFolder;
    const missingCharaFolder = !charaFolder;
    const missingSigSource = !sigSource;
    const ronChecked = !!ronOverride;

    // Setup moves above Tools if any core setup is missing
    const setupNeedsAttention = missingProject || missingModFolder || missingSigSource || missingCharaFolder;

    const projectSection = `
      <div class="section">
        <div class="section-title">Project</div>

        <div class="meta-label">Project Name:</div>
        <div class="meta-value">${escapeHtml(projectName)}</div>

        <div class="meta-label">Project Path:</div>
        <div class="meta-value">${escapeHtml(projectRoot || "Path/To/Project/Folder")}</div>
      </div>
    `;

    const toolsSection = `
      <div class="section">
        <div class="section-title">Tools</div>

        <div class="action-row">
          <button class="action-button" onclick="sendCommand('bbscript.extractParse')">
            Extract
          </button>
          <label class="inline-check">
            <span>Custom Ron</span>
            <input
              type="checkbox"
              ${ronChecked ? "checked" : ""}
              onchange="toggleCustomRon(this.checked)" />
          </label>
        </div>

        <div class="action-row">
          <button class="action-button" onclick="sendCommand('bbscript.rebuildPackage')">
            Save and Package
          </button>
          <label class="inline-check">
            <span>Overwrite</span>
            <input
              type="checkbox"
              ${overwriteRebuildPackage ? "checked" : ""}
              onchange="setCheckboxState('overwriteRebuildPackage', this.checked)" />
          </label>
        </div>

        <div class="action-row">
          <button class="action-button" onclick="sendCommand('bbscript.fullDeploy')">
            Build in Mods Folder
          </button>
          <label class="inline-check">
            <span>Overwrite</span>
            <input
              type="checkbox"
              ${overwriteFullDeploy ? "checked" : ""}
              onchange="setCheckboxState('overwriteFullDeploy', this.checked)" />
          </label>
        </div>

        <details class="more-tools">
          <summary>More Tools</summary>

          <div class="action-row nested">
            <button class="action-button" onclick="sendCommand('bbscript.reformatFiles')">
              Reformat Files
            </button>
          </div>

          <div class="action-row nested">
            <button class="action-button" onclick="sendCommand('bbscript.rebuildReinject')">
              Save to UASSETS
            </button>
            <label class="inline-check">
              <span>Overwrite</span>
              <input
                type="checkbox"
                ${overwriteRebuild ? "checked" : ""}
                onchange="setCheckboxState('overwriteRebuild', this.checked)" />
            </label>
          </div>

          <div class="action-row nested">
            <button class="action-button" onclick="sendCommand('bbscript.package')">
              Create PAK
            </button>
            <label class="inline-check">
              <span>Overwrite</span>
              <input
                type="checkbox"
                ${overwritePackage ? "checked" : ""}
                onchange="setCheckboxState('overwritePackage', this.checked)" />
            </label>
          </div>

          <div class="action-row nested">
            <button class="action-button" onclick="sendCommand('bbscript.deploy')">
              Send PAK to Mods
            </button>
            <label class="inline-check">
              <span>Overwrite</span>
              <input
                type="checkbox"
                ${overwriteDeploy ? "checked" : ""}
                onchange="setCheckboxState('overwriteDeploy', this.checked)" />
            </label>
          </div>
        </details>
      </div>
    `;

    const setupSection = `
      <div class="section">
        <div class="section-title">Setup</div>

        <div class="setup-block">
          <button
            class="action-button ${missingProject ? "needed-button" : ""}"
            onclick="sendCommand('bbscript.selectProjectFolder')">
            Select Project Folder
          </button>
          <div class="meta-value">
            Project Folder: ${escapeHtml(projectRoot || "Path/To/Project/Folder")}
          </div>
        </div>

        <div class="setup-block">
          <button
            class="action-button ${missingModFolder ? "needed-button" : ""}"
            onclick="sendCommand('bbscript.setModFolder')">
            Set Mod Folder
          </button>
          <div class="meta-value">
            Mod Folder: ${escapeHtml(modFolder || "Path/To/Mod/Folder")}
          </div>
        </div>
        <div class="setup-block">
          <button
            class="action-button ${missingCharaFolder ? "needed-button" : ""}"
            onclick="sendCommand('bbscript.setCharaFolder')">
            Select Chara Folder
          </button>
          <div class="meta-value">
            Chara Folder: ${escapeHtml(charaFolder || "Path/To/Chara/Folder")}
          </div>
        </div>

        <div class="setup-block">
          <button
            class="action-button ${missingSigSource ? "needed-button" : ""}"
            onclick="sendCommand('bbscript.setSigSource')">
            Set Sig Source
          </button>
          <div class="meta-value">
            Sig Source: ${escapeHtml(sigSource || "Path/To/Sig/Source")}
          </div>
        </div>

        <div class="setup-block">
          <button
            class="action-button ${!ronOverride ? "needed-button" : ""}"
            onclick="sendCommand('bbscript.setRonOverride')">
            Set Custom Ron
          </button>
          <div class="meta-value">
            Custom Ron: ${escapeHtml(ronOverride || "Path/To/Custom/Ron")}
          </div>
        </div>
      </div>
    `;

    const orderedSections = setupNeedsAttention
      ? `${projectSection}${setupSection}${toolsSection}`
      : `${projectSection}${toolsSection}${setupSection}`;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      padding: 10px 10px 18px 10px;
      margin: 0;
    }

    .section {
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
      opacity: 0.95;
    }

    .meta-label {
      font-weight: 600;
      margin-top: 8px;
      margin-bottom: 2px;
    }

    .meta-value {
      word-break: break-word;
      opacity: 0.9;
      margin-bottom: 8px;
    }

    .setup-block {
      margin-bottom: 12px;
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;     /* checkbox drops below if needed */
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .action-row.nested {
      margin-top: 12px;
    }

    .action-button {
      flex: 1 1 220px;     /* standardized width behavior */
      min-height: 34px;    /* standardized height */
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      padding: 7px 10px;
      font: inherit;
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
    }

    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .needed-button {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-editor-foreground);
      outline: 1px solid var(--vscode-inputValidation-warningBorder);
    }

    .needed-button:hover {
      filter: brightness(0.96);
    }

    .inline-check {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      font-size: 12px;
      opacity: 0.95;
    }

    .inline-check input[type="checkbox"] {
      margin: 0;
    }

    details.more-tools {
      margin-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
      padding-top: 10px;
    }

    details.more-tools summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 8px;
      list-style: none;
    }

    details.more-tools summary::-webkit-details-marker {
      display: none;
    }

    details.more-tools summary::before {
      content: "▸ ";
      display: inline-block;
    }

    details.more-tools[open] summary::before {
      content: "▾ ";
    }
  </style>
</head>
<body>
  ${orderedSections}

  <script>
    const vscode = acquireVsCodeApi();

    function sendCommand(command) {
      vscode.postMessage({ command });
    }

    function toggleCustomRon(enabled) {
      vscode.postMessage({
        command: "bbscript.toggleCustomRon",
        enabled
      });
    }

    function setCheckboxState(key, value) {
      vscode.postMessage({
        command: "bbscript.setCheckboxState",
        key,
        value
      });
    }
  </script>
</body>
</html>`;
  }
}

module.exports = {
  SidebarViewProvider
};