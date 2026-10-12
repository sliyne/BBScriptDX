const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { getCharaFolder } = require("../workflow/settings");
const { getColEditorHtml } = require("./getColEditorHtml");

const HITBOX_COLOR_DEFAULTS = Object.freeze({
  hurtbox: "#36d66b",
  hitbox: "#ff3b4d",
  exPoint: "#4da6ff",
  exRect: "#c84dff",
  exVector: "#4dfff3",
  push: "#ffcc4d",
  tempCenter: "#ff7abf",
  neck: "#a8ff4d",
  abdominal: "#8b8bff",
  spGuard: "#d4d4d4",
  rLeg: "#4da6ff",
  lLeg: "#c84dff",
  private0: "#4dfff3",
  private1: "#ffcc4d",
  private2: "#ff7abf",
  private3: "#a8ff4d",
  extendJon: "#8b8bff",
  unknown: "#d4d4d4",
  comboHitbox: "#f5a623"
});
const HITBOX_COLOR_KEYS = Object.keys(HITBOX_COLOR_DEFAULTS);
function getHitboxColors() {
  const configuration = vscode.workspace.getConfiguration("bbscript.hitboxColors");
  return HITBOX_COLOR_KEYS.map((key) => {
    const value = configuration.get(key, HITBOX_COLOR_DEFAULTS[key]);
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : HITBOX_COLOR_DEFAULTS[key];
  });
}
class ColCustomEditorProvider {
  static viewType = "bbscript.colEditor";

  constructor(context) {
    this.context = context;
    this.editors = new Set();
    this.pendingSpriteSelections = new Map();
  }

  refreshCharaFolders() {
    for (const editor of this.editors) {
      editor.refreshCharaFolder();
    }
  }
  refreshHitboxColors() {
    const colors = getHitboxColors();
    for (const editor of this.editors) {
      editor.updateHitboxColors(colors);
    }
  }
  async openSprite(resource, spriteName) {
    const uri = resource instanceof vscode.Uri ? resource : vscode.Uri.parse(String(resource));
    const key = uri.toString();
    const existing = Array.from(this.editors).find((editor) => editor.uri === key);
    if (existing) {
      existing.panel.reveal();
      await existing.selectSprite(spriteName);
      return;
    }

    this.pendingSpriteSelections.set(key, String(spriteName));
    await vscode.commands.executeCommand(
      "vscode.openWith",
      uri,
      ColCustomEditorProvider.viewType
    );
  }

  async resolveCustomTextEditor(document, webviewPanel) {
    let pendingEditorChanges = 0;
    const documentKey = document.uri.toString();
    const shorthand = getCharacterShorthand(document.uri.fsPath);
    let initialSpriteName = this.pendingSpriteSelections.get(documentKey) || "";
    this.pendingSpriteSelections.delete(documentKey);

    const updateWebviewRoots = () => {
      const roots = [vscode.Uri.file(path.dirname(document.uri.fsPath))];
      const charaFolder = getCharaFolder(this.context);
      if (charaFolder) roots.push(vscode.Uri.file(charaFolder));
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: roots
      };
    };

    const refreshCharaFolder = () => {
      updateWebviewRoots();
      webviewPanel.webview.postMessage({
        type: "charaFolderChanged",
        charaFolder: getCharaFolder(this.context) || ""
      });
    };

    const selectSprite = async (spriteName) => {
      await webviewPanel.webview.postMessage({
        type: "selectEntryByName",
        entryName: String(spriteName)
      });
    };
    const updateHitboxColors = async (colors) => {
      await webviewPanel.webview.postMessage({
        type: "hitboxColorsChanged",
        colors
      });
    };
    const editorRegistration = {
      uri: documentKey,
      panel: webviewPanel,
      refreshCharaFolder,
      selectSprite,
      updateHitboxColors
    };
    this.editors.add(editorRegistration);
    updateWebviewRoots();

    const renderDocument = () => {
      let entries = [];
      let error = null;
      try {
        const parsed = JSON.parse(document.getText());
        const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
        entries = rawEntries
          .map((entry, originalIndex) => normalizeEntry(entry, originalIndex))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
            numeric: true
          }));
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      webviewPanel.webview.html = getColEditorHtml({
        entries,
        error,
        charaFolder: getCharaFolder(this.context) || "",
        shorthand,
        initialSpriteName,
        hitboxColors: getHitboxColors()
      });
      initialSpriteName = "";
    };

    const applyMutation = async (mutation) => {
      try {
        const parsed = JSON.parse(document.getText());
        if (!Array.isArray(parsed.entries)) {
          throw new Error("COL JSON is missing its entries array.");
        }
        mutation(parsed);
        const replacement = JSON.stringify(parsed, null, 2) + "\n";
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, replacement);
        pendingEditorChanges += 1;
        const applied = await vscode.workspace.applyEdit(edit);
        if (!applied) {
          pendingEditorChanges = Math.max(0, pendingEditorChanges - 1);
          throw new Error("VS Code rejected the COL JSON edit.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[COL Editor] Edit failed:", err);
        webviewPanel.webview.postMessage({ type: "editError", message });
      }
    };

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (!message || typeof message !== "object") return;

      if (message.type === "resolveAssociatedImage") {
        const requestId = Number(message.requestId) || 0;
        const associatedImage = typeof message.associatedImage === "string"
          ? message.associatedImage
          : "";
        const result = resolveAssociatedImage(
          getCharaFolder(this.context),
          shorthand,
          associatedImage
        );
        webviewPanel.webview.postMessage({
          type: "imageResolved",
          requestId,
          associatedImage,
          found: Boolean(result.filePath),
          imageUri: result.filePath
            ? webviewPanel.webview.asWebviewUri(vscode.Uri.file(result.filePath)).toString()
            : "",
          message: result.message
        });
        return;
      }

      if (message.type === "replaceEntriesBoxes") {
        await applyMutation((parsed) => {
          const replacements = Array.isArray(message.entries) ? message.entries : [];
          for (const replacement of replacements) {
            const entry = getEntry(parsed, replacement.entryIndex);
            const groups = Array.isArray(replacement.boxGroups) ? replacement.boxGroups : [];
            entry.box_groups = groups.map((group, groupIndex) => {
              const kind = kindValue(
                group && group.group_index !== undefined
                  ? group.group_index
                  : groupIndex
              );
              const boxes = Array.isArray(group && group.boxes) ? group.boxes : [];
              return {
                group_index: kind,
                boxes: boxes.map((box) => ({
                  kind,
                  x_offset: finite(box && box.x_offset, 0),
                  y_offset: finite(box && box.y_offset, 0),
                  width: finite(box && box.width, 0),
                  height: finite(box && box.height, 0)
                }))
              };
            });
          }
        });
        return;
      }

      if (message.type === "replaceSpriteBoxes") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const groups = Array.isArray(message.boxGroups)
            ? message.boxGroups
            : [];

          entry.box_groups = groups.map((group, groupIndex) => {
            const kind = kindValue(
              group && group.group_index !== undefined
                ? group.group_index
                : groupIndex
            );

            const boxes = Array.isArray(group && group.boxes)
              ? group.boxes
              : [];

            return {
              group_index: kind,
              boxes: boxes.map((box) => ({
                kind,
                x_offset: finite(box && box.x_offset, 0),
                y_offset: finite(box && box.y_offset, 0),
                width: finite(box && box.width, 0),
                height: finite(box && box.height, 0)
              }))
            };
          });
        });
      } else if (message.type === "updateAssociatedImage") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const imageName = typeof message.imageName === "string"
            ? message.imageName
            : "";

          if (!Array.isArray(entry.names)) {
            entry.names = [];
          }

          if (entry.names.length === 0) {
            entry.names.push(imageName);
          } else {
            entry.names[0] = imageName;
          }
        });
      } else if (message.type === "updateBox") {
        await applyMutation((parsed) => {
          const box = getBox(parsed, message.entryIndex, message.groupIndex, message.boxIndex);
          box.x_offset = finite(message.box.x_offset, box.x_offset);
          box.y_offset = finite(message.box.y_offset, box.y_offset);
          box.width = finite(message.box.width, box.width);
          box.height = finite(message.box.height, box.height);
        });
      } else if (message.type === "pasteBox") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const source = getGroup(entry, message.groupIndex);
          const boxIndex = validBoxIndex(source.group, message.boxIndex);
          const box = source.group.boxes.splice(boxIndex, 1)[0];
          const kind = kindValue(message.box.kind);

          box.kind = kind;
          box.x_offset = finite(message.box.x_offset, box.x_offset);
          box.y_offset = finite(message.box.y_offset, box.y_offset);
          box.width = finite(message.box.width, box.width);
          box.height = finite(message.box.height, box.height);

          ensureGroup(entry, kind).boxes.push(box);

          if (source.group.boxes.length === 0) {
            entry.box_groups.splice(source.index, 1);
          }
        });
      } else if (message.type === "changeBoxKind") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const source = getGroup(entry, message.groupIndex);
          const boxIndex = validBoxIndex(source.group, message.boxIndex);
          const box = source.group.boxes.splice(boxIndex, 1)[0];
          const kind = kindValue(message.kind);
          box.kind = kind;
          ensureGroup(entry, kind).boxes.push(box);
          if (source.group.boxes.length === 0) entry.box_groups.splice(source.index, 1);
        });
      } else if (message.type === "addBox") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const kind = kindValue(message.kind);
          ensureGroup(entry, kind).boxes.push({
            kind,
            x_offset: 0,
            y_offset: 0,
            width: 100,
            height: 100
          });
        });
      } else if (message.type === "deleteBox") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const location = getGroup(entry, message.groupIndex);
          const boxIndex = validBoxIndex(location.group, message.boxIndex);
          location.group.boxes.splice(boxIndex, 1);
          if (location.group.boxes.length === 0) entry.box_groups.splice(location.index, 1);
        });
      } else if (message.type === "duplicateBox") {
        await applyMutation((parsed) => {
          const entry = getEntry(parsed, message.entryIndex);
          const location = getGroup(entry, message.groupIndex);
          const boxIndex = validBoxIndex(location.group, message.boxIndex);
          const clone = JSON.parse(JSON.stringify(location.group.boxes[boxIndex]));
          location.group.boxes.splice(boxIndex + 1, 0, clone);
        });
      }
    });

    renderDocument();

    const configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("bbscript.hitboxColors")) {
        this.refreshHitboxColors();
      }
    });
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) return;
      if (pendingEditorChanges > 0) {
        pendingEditorChanges -= 1;
        return;
      }
      renderDocument();
    });

    webviewPanel.onDidDispose(() => {
      changeSubscription.dispose();
      configurationSubscription.dispose();
      this.editors.delete(editorRegistration);
    });
  }
}

function getCharacterShorthand(filePath) {
  return path.basename(filePath, path.extname(filePath)).replace(/^COL_/i, "");
}

function resolveAssociatedImage(charaFolder, shorthand, associatedImage) {
  if (!charaFolder) {
    return { filePath: "", message: "Select a Chara folder in BBScript: Workflow > Setup." };
  }
  if (!associatedImage) {
    return { filePath: "", message: "No Associated Image is assigned." };
  }

  const root = normalizeCharaRoot(charaFolder);
  const characterFolder = findChild(root, shorthand, true);
  if (!characterFolder) {
    return { filePath: "", message: `Character folder not found: ${shorthand}` };
  }

  const collisionFolder = findChild(characterFolder, "Collision", true);
  if (!collisionFolder) {
    return { filePath: "", message: "Collision folder not found." };
  }

  const requested = path.basename(String(associatedImage).trim());
  const requestedBase = path.basename(requested, path.extname(requested)).toLowerCase();
  const requestedExtension = path.extname(requested).toLowerCase();
  const supported = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);

  let files = [];
  try {
    files = fs.readdirSync(collisionFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return { filePath: "", message: "Could not read Collision folder." };
  }

  const exact = files.find((name) => name.toLowerCase() === requested.toLowerCase());
  if (exact) return { filePath: path.join(collisionFolder, exact), message: "" };

  const baseMatch = files.find((name) => {
    const extension = path.extname(name).toLowerCase();
    const base = path.basename(name, extension).toLowerCase();
    return base === requestedBase && supported.has(extension) && (!requestedExtension || extension === requestedExtension);
  });
  if (baseMatch) return { filePath: path.join(collisionFolder, baseMatch), message: "" };

  return { filePath: "", message: `Image not found: ${requested}` };
}

function normalizeCharaRoot(selectedPath) {
  if (!selectedPath) return "";
  if (path.basename(selectedPath).toLowerCase() === "chara") return selectedPath;
  return findChild(selectedPath, "Chara", true) || selectedPath;
}

function findChild(parent, name, directory) {
  try {
    const match = fs.readdirSync(parent, { withFileTypes: true }).find((entry) =>
      entry.name.toLowerCase() === String(name).toLowerCase() &&
      (directory ? entry.isDirectory() : entry.isFile())
    );
    return match ? path.join(parent, match.name) : "";
  } catch {
    return "";
  }
}

function normalizeEntry(entry, originalIndex) {
  const source = entry && typeof entry === "object" ? entry : {};
  const groups = Array.isArray(source.box_groups) ? source.box_groups : [];
  return {
    originalIndex,
    name: typeof source.name === "string" ? source.name : "Entry " + originalIndex,
    names: Array.isArray(source.names) ? source.names.filter((v) => typeof v === "string") : [],
    box_groups: groups.map((group, groupIndex) => {
      const sourceGroup = group && typeof group === "object" ? group : {};
      const boxes = Array.isArray(sourceGroup.boxes) ? sourceGroup.boxes : [];
      return {
        group_index: finite(sourceGroup.group_index, groupIndex),
        boxes: boxes.map((box, boxIndex) => ({
          box_index: boxIndex,
          kind: finite(box && box.kind, 0),
          x_offset: finite(box && box.x_offset, 0),
          y_offset: finite(box && box.y_offset, 0),
          width: finite(box && box.width, 0),
          height: finite(box && box.height, 0)
        }))
      };
    })
  };
}

function getEntry(parsed, entryIndex) {
  const index = integer(entryIndex, -1);
  if (index < 0 || index >= parsed.entries.length) throw new Error("Sprite no longer exists.");
  const entry = parsed.entries[index];
  if (!Array.isArray(entry.box_groups)) entry.box_groups = [];
  return entry;
}

function getGroup(entry, groupIndex) {
  const target = integer(groupIndex, -1);
  const index = entry.box_groups.findIndex((group) => Number(group.group_index) === target);
  if (index < 0) throw new Error("Box group no longer exists.");
  const group = entry.box_groups[index];
  if (!Array.isArray(group.boxes)) group.boxes = [];
  return { group, index };
}

function getBox(parsed, entryIndex, groupIndex, boxIndexValue) {
  const entry = getEntry(parsed, entryIndex);
  const group = getGroup(entry, groupIndex).group;
  return group.boxes[validBoxIndex(group, boxIndexValue)];
}

function validBoxIndex(group, value) {
  const index = integer(value, -1);
  if (index < 0 || index >= group.boxes.length) throw new Error("Box no longer exists.");
  return index;
}

function ensureGroup(entry, kind) {
  let group = entry.box_groups.find((item) => Number(item.group_index) === kind);
  if (!group) {
    group = { group_index: kind, boxes: [] };
    entry.box_groups.push(group);
    entry.box_groups.sort((a, b) => Number(a.group_index) - Number(b.group_index));
  }
  if (!Array.isArray(group.boxes)) group.boxes = [];
  return group;
}

function kindValue(value) {
  return Math.min(Math.max(integer(value, 0), 0), 18);
}

function integer(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = { ColCustomEditorProvider };
