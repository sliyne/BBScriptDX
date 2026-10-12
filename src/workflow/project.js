const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const {
  getProjectName,
  getProjectConfigPath,
  ensureProjectFolders
} = require("./paths");
const { setProjectFolder } = require("./settings");
const { log, info } = require("./output");

async function selectProjectFolder(context) {
  const result = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select BBScript Project Folder"
  });

  if (!result || result.length === 0) {
    return;
  }

  const projectRoot = result[0].fsPath;
  await initializeProject(context, projectRoot);
}

function ensureWorkspaceSettings(projectRoot) {
  // Template file inside the extension repo
  const templateSettingsPath = path.resolve(__dirname, "../../.vscode/settings.json");

  // Target file inside the selected BBScript project
  const projectVscodeDir = path.join(projectRoot, ".vscode");
  const projectSettingsPath = path.join(projectVscodeDir, "settings.json");

  if (!fs.existsSync(templateSettingsPath)) {
    throw new Error(`Template settings.json not found: ${templateSettingsPath}`);
  }

  if (!fs.existsSync(projectVscodeDir)) {
    fs.mkdirSync(projectVscodeDir, { recursive: true });
  }

  // Create only if missing so we do not overwrite a user's existing workspace settings
  if (!fs.existsSync(projectSettingsPath)) {
    fs.copyFileSync(templateSettingsPath, projectSettingsPath);
    log(`Created workspace settings: ${projectSettingsPath}`);
  }

  return projectSettingsPath;
}

async function initializeProject(context, projectRoot) {
  ensureProjectFolders(projectRoot);

  const configPath = getProjectConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    const config = {
      projectName: getProjectName(projectRoot)
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    log(`Created project config: ${configPath}`);
  }

  const settingsPath = ensureWorkspaceSettings(projectRoot);

  await setProjectFolder(context, projectRoot);
  info(`Selected BBScript project: ${projectRoot}`);
  info(`Workspace settings ensured: ${settingsPath}`);
}

function loadProjectConfig(projectRoot) {
  const configPath = getProjectConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

module.exports = {
  selectProjectFolder,
  initializeProject,
  loadProjectConfig
};