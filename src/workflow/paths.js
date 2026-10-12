const path = require("path");
const fs = require("fs");

function getProjectName(projectRoot) {
  return path.basename(projectRoot);
}

function getProjectConfigPath(projectRoot) {
  return path.join(projectRoot, ".bbscript-project.json");
}

function getUassetsRoot(projectRoot) {
  return path.join(projectRoot, "UASSETS");
}

function getBbsRoot(projectRoot) {
  return path.join(projectRoot, "BBS Files");
}

function getBbscriptRoot(projectRoot) {
  return path.join(getBbsRoot(projectRoot), ".bbscript Files");
}

function getPackagesRoot(projectRoot) {
  return path.join(projectRoot, "PACKAGES");
}

function ensureProjectFolders(projectRoot) {
  const folders = [
    getUassetsRoot(projectRoot),
    getBbsRoot(projectRoot),
    getPackagesRoot(projectRoot)
  ];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}

function getBundledRonPath(context) {
  return context.asAbsolutePath(path.join("resources", "default.ron"));
}

function getBundledHelperPath(context) {
  return context.asAbsolutePath(
    path.join("bin", "win32-x64", "bbscript-helper.exe")
  );
}

function getBundledPacToJsonPath(context) {
  return context.asAbsolutePath(
    path.join("bin", "win32-x64", "pac_to_json.exe")
  );
}

function getBundledJsonToPacPath(context) {
  return context.asAbsolutePath(
    path.join("bin", "win32-x64", "json_to_pac.exe")
  );
}

module.exports = {
  getProjectName,
  getProjectConfigPath,
  getUassetsRoot,
  getBbsRoot,
  getBbscriptRoot,
  getPackagesRoot,
  ensureProjectFolders,
  getBundledRonPath,
  getBundledHelperPath,
  getBundledPacToJsonPath,
  getBundledJsonToPacPath
};