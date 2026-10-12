const vscode = require("vscode");

const KEYS = {
  modFolder: "bbscript.modFolder",
  charaFolder: "bbscript.charaFolder",
  sigSource: "bbscript.sigSource",
  ronOverride: "bbscript.ronOverride",
  projectFolder: "bbscript.projectFolder",

  overwriteRebuild: "bbscript.overwriteRebuild",
  overwritePackage: "bbscript.overwritePackage",
  overwriteDeploy: "bbscript.overwriteDeploy",
  overwriteRebuildPackage: "bbscript.overwriteRebuildPackage",
  overwriteFullDeploy: "bbscript.overwriteFullDeploy"

};

function getGlobal(context, key) {
  return context.globalState.get(key);
}

async function setGlobal(context, key, value) {
  await context.globalState.update(key, value);
}

function getModFolder(context) {
  return getGlobal(context, KEYS.modFolder);
}

function setModFolder(context, value) {
  return setGlobal(context, KEYS.modFolder, value);
}
function getCharaFolder(context) {
  return getGlobal(context, KEYS.charaFolder);
}
function setCharaFolder(context, value) {
  return setGlobal(context, KEYS.charaFolder, value);
}

function getSigSource(context) {
  return getGlobal(context, KEYS.sigSource);
}

function setSigSource(context, value) {
  return setGlobal(context, KEYS.sigSource, value);
}

function getRonOverride(context) {
  return getGlobal(context, KEYS.ronOverride);
}

function setRonOverride(context, value) {
  return setGlobal(context, KEYS.ronOverride, value);
}

function clearRonOverride(context) {
  return setGlobal(context, KEYS.ronOverride, undefined);
}

function getProjectFolder(context) {
  return getGlobal(context, KEYS.projectFolder);
}

function setProjectFolder(context, value) {
  return setGlobal(context, KEYS.projectFolder, value);
}

function getOverwriteRebuild(context) {
  return !!context.globalState.get(KEYS.overwriteRebuild, false);
}

async function setOverwriteRebuild(context, value) {
  await context.globalState.update(KEYS.overwriteRebuild, !!value);
}

function getOverwritePackage(context) {
  return !!context.globalState.get(KEYS.overwritePackage, false);
}

async function setOverwritePackage(context, value) {
  await context.globalState.update(KEYS.overwritePackage, !!value);
}

function getOverwriteDeploy(context) {
  return !!context.globalState.get(KEYS.overwriteDeploy, false);
}

async function setOverwriteDeploy(context, value) {
  await context.globalState.update(KEYS.overwriteDeploy, !!value);
}

function getOverwriteRebuildPackage(context) {
  return !!context.globalState.get(KEYS.overwriteRebuildPackage, false);
}

async function setOverwriteRebuildPackage(context, value) {
  await context.globalState.update(KEYS.overwriteRebuildPackage, !!value);
}

function getOverwriteFullDeploy(context) {
  return !!context.globalState.get(KEYS.overwriteFullDeploy, false);
}

async function setOverwriteFullDeploy(context, value) {
  await context.globalState.update(KEYS.overwriteFullDeploy, !!value);
}

module.exports = {
  KEYS,
  getModFolder,
  setModFolder,
  getCharaFolder,
  setCharaFolder,
  getSigSource,
  setSigSource,
  getRonOverride,
  setRonOverride,
  clearRonOverride,
  getProjectFolder,
  setProjectFolder,
  
  getOverwriteRebuild,
  setOverwriteRebuild,
  getOverwritePackage,
  setOverwritePackage,
  getOverwriteDeploy,
  setOverwriteDeploy,
  getOverwriteRebuildPackage,
  setOverwriteRebuildPackage,
  getOverwriteFullDeploy,
  setOverwriteFullDeploy

};
