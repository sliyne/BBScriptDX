const vscode = require("vscode");

let channel = null;

function getOutputChannel() {
  if (!channel) {
    channel = vscode.window.createOutputChannel("BBScript Tools");
  }
  return channel;
}

function log(message) {
  const output = getOutputChannel();
  output.appendLine(message);
}

function show() {
  getOutputChannel().show(true);
}

function info(message) {
  vscode.window.showInformationMessage(message);
  log(`[INFO] ${message}`);
}

function warn(message) {
  vscode.window.showWarningMessage(message);
  log(`[WARN] ${message}`);
}

function error(message) {
  vscode.window.showErrorMessage(message);
  log(`[ERROR] ${message}`);
}

module.exports = {
  getOutputChannel,
  log,
  show,
  info,
  warn,
  error
};
