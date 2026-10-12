const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const instructions = require("../generated/instructions.json");
const enums = require("../generated/enums.json");
const variables = require("../generated/variables.json");
const selectProjectCommand = require("./commands/selectProject");
const setModFolderCommand = require("./commands/setModFolder");
const setCharaFolderCommand = require("./commands/setCharaFolder");
const extractParseCommand = require("./commands/extractParse");
const setSigSourceCommand = require("./commands/setSigSource");
const setRonOverrideCommand = require("./commands/setRonOverride");
const useDefaultRonCommand = require("./commands/useDefaultRon");
const { getRuntimeEnvironment } = require("./workflow/runtime");
const { getOutputChannel } = require("./workflow/output");
const debugAssetDiscoveryCommand = require("./commands/debugAssetDiscovery");
const rebuildReinjectCommand = require("./commands/rebuildReinject");
const packageCommand = require("./commands/package");
const deployCommand = require("./commands/deploy");
const rebuildPackageCommand = require("./commands/rebuildPackage");
const reformatCommand = require("./commands/reformatFiles");
const fullDeployCommand = require("./commands/fullDeploy");
const { SidebarViewProvider } = require("./ui/sidebarViewProvider");

const { registerColEditor } = require("./colEditor/registerColEditor");



function getBbsCharacterCode(document) {
  const baseName = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
  return baseName.replace(/EF$/i, "");
}

function findBbsFilesRoot(filePath) {
  let current = path.dirname(filePath);
  while (true) {
    if (path.basename(current).toLowerCase() === "bbs files") return current;
    const parent = path.dirname(current);
    if (parent === current) return "";
    current = parent;
  }
}

function findFileRecursive(root, targetName) {
  if (!root || !fs.existsSync(root)) return "";
  const target = targetName.toLowerCase();
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === target) return fullPath;
      if (entry.isDirectory() && entry.name !== ".bbscript Files") stack.push(fullPath);
    }
  }
  return "";
}

function resolveColFileForBbs(document) {
  const characterCode = getBbsCharacterCode(document);
  const targetName = `COL_${characterCode}.json`;
  const sameDirectory = path.join(path.dirname(document.uri.fsPath), targetName);
  if (fs.existsSync(sameDirectory)) return sameDirectory;
  const bbsRoot = findBbsFilesRoot(document.uri.fsPath);
  return findFileRecursive(bbsRoot || path.dirname(document.uri.fsPath), targetName);
}

function readColEntryNames(colPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(colPath, "utf8"));
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return new Set(
      entries
        .map((entry) => typeof entry?.name === "string" ? entry.name.toLowerCase() : "")
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function findSpriteReferences(document) {
  const references = [];
  const regex = /\bsprite\s*:\s*s32'([^']+)'\s*,/gi;
  for (let line = 0; line < document.lineCount; line += 1) {
    const text = document.lineAt(line).text;
    let match;
    while ((match = regex.exec(text))) {
      const full = match[0];
      const name = match[1];
      const relativeStart = full.indexOf(name);
      const start = match.index + relativeStart;
      references.push({
        name,
        range: new vscode.Range(line, start, line, start + name.length)
      });
    }
    regex.lastIndex = 0;
  }
  return references;
}

// ✅ =============================
// ✅ BUILD SNIPPETS (unchanged)
// ✅ =============================
function buildSnippetText(instr) {
  let index = 1;

  if (!instr.args || instr.args.length === 0) {
    return `${instr.name}:`;
  }

  const parts = instr.args.map(arg => {

    if (arg.type === "String") {
      
    // ✅ Commands that use s16 instead
      const s16Commands = [
        "ifPlayerCharacter",
        "ifOpponentCharacter",
        "ifOpponentCharacterMain",
        "checkEnemyNameNotBoss",
        "checkTeamMemberName",
        "checkTeamMemberAlive",
        "checkEnemyTeamMemberName",
        "checkEnemyTeamMemberAlive",
        "checkTeamMember",
        "eventMessageToDelay",
        "eventMessageToDelayWithArg",
        "priorityVoice",
        "setupVoice",
        "smartDamageRandomVoiceLine",
        "forceRandomDamageVoiceLine",
        "cmnVoiceLine",
        "voiceLine",
        "smartVoiceLine",
        "deathVoice",
        "randomVoiceLine",
        "smartRandomVoiceLine",
        "smartVoiceLineEx",
        "forceRandomVoice",
        "forceRandomVoiceWeak",
        "attackVoiceGG",
        "commonVoiceTable",
        "tutorialVoice",
        "forceDamageVoiceLine",
        "randomVoiceLineTwoOptions",
        "fixAndGetVoicePattern",
        "setupVoiceEx",
        "SetupVoice_IgnoreStatic",
        "charaName",
        "checkStageName",
        "ifCharaID",
        "initCharaNameForVoice",
      ];

      const type = s16Commands.includes(instr.name) ? "s16" : "s32";

      return `${type}'\${${index++}:name}'`;
    }

    if (arg.type === "AccessedValue") {
      return `\${${index++}|Val(0),Mem(var)|}`;
    }

    if (arg.type === "Number") {
      return `\${${index++}:0}`;
    }

    if (arg.type === "Enum") {
      const values = enums[arg.enumName] || [];

      if (values.length > 0) {
        return `(\${${index++}|${values.join(",")}|})`;
      }

      return `(\${${index++}:VALUE})`;
    }

    return `\${${index++}:arg}`;
  });

  const blockPairs = {
    "if": "endIf",
    "ifNot": "endIf",
    "ifOperation": "endIf",
    "ifPlayerCharacter": "endIf",
    "ifOpponentCharacter": "endIf",
    "ifCharaID": "endIf",
    "ifOnFrame": "endIf",
    "ifPlayerAlive": "endIf",
    "ifEnemyPlayerAlive": "endIf",
    "ifGameMode": "endIf",
    "ifTrueInObject": "endIf",
    "ifNotInObject": "endIf",
    "ifOperationInObject": "endIf",
    "else": "endElse",
    "upon": "endUpon",
    "beginState": "endState",
    "postSubroutineBegin": "endSubroutine",
    "beginSubroutine": "endSubroutine",
    "runOnObject": "endRunOnObject",
    "addMove": "endMove",
    "dramaticSetBegin": "dramaticSetEnd"
  };

  if (blockPairs[instr.name]) {
    const end = blockPairs[instr.name];
    const header = parts.length > 0 ? ` ${parts.join(", ")}` : "";

    return `${instr.name}:${header}
\t$0
${end}:`;
  }


  return `${instr.name}: ${parts.join(", ")}`;
}


// ✅ =============================
// ✅ ✅ ✅ NEW: VALIDATION FUNCTION
// ✅ =============================
function validateDocument(document) {
  const diagnostics = [];
  const lines = document.getText().split("\n");

  const stack = [];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const rawLine = lines[lineNum];
    const line = rawLine.trim()

      
    // ✅ UNFINISHED MEM DETECTION
    if (/Mem\(\s*[^)]*$/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed Mem(...)",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

    
    // ✅ UNFINISHED ENUM DETECTION
    if (/\(\s*[^)]*$/.test(rawLine) && !/Mem\(/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed enum/Mem/Val parentheses",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

    // ✅ UNFINISHED STRING DETECTION
    if (/s(32|16)'\s*[^']*$/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed string literal",
          vscode.DiagnosticSeverity.Error
        )
      );
    }



    // ✅ ENUM VALIDATION (FINAL FIXED VERSION)
    const commandMatch = rawLine.match(/^\s*(\w+):\s*(.*)/);

    // ✅ Skip non-command lines
    if (!commandMatch) continue;

    const command = commandMatch[1];
    const argsText = commandMatch[2];

    const instr = Object.values(instructions).find(i => i.name === command);

    
    // ✅ ARGUMENT COUNT VALIDATION
    if (instr && instr.args) {

      // ✅ Split arguments
      const rawArgs = argsText
        .split(",")
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const expectedCount = instr.args.length;
      const actualCount = rawArgs.length;

      // ✅ Missing arguments
      if (actualCount < expectedCount) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            `Expected ${expectedCount} arguments, got ${actualCount}`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }

      // ✅ Too many arguments
      if (actualCount > expectedCount) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            `Too many arguments: expected ${expectedCount}, got ${actualCount}`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }


    if (instr && instr.args) {
      
      // ✅ ENUM VALIDATION (POSITION-BASED — CORRECT)
      const rawArgs = argsText
        .split(",")
        .map(a => a.trim())
        .filter(a => a.length > 0);

      for (let i = 0; i < instr.args.length; i++) {
        const argDef = instr.args[i];

        // ✅ Only care about Enum arguments
        if (argDef.type !== "Enum") continue;

        const argText = rawArgs[i];
        if (!argText) continue;

        // ✅ Must be pure "(VALUE)" — NOT Mem(...) or Val(...)
        const match = argText.match(/^\(\s*([^)]+?)\s*\)$/);
        if (!match) continue;

        const value = match[1].trim();
        const enumValues = enums[argDef.enumName] || [];

        if (!enumValues.includes(value)) {
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(lineNum, 0, lineNum, rawLine.length),
              `Invalid enum value: ${value}`,
              vscode.DiagnosticSeverity.Error
            )
          );
        }
      }

    }


    // ✅ BLOCK START
    if (/^(if|ifNot|ifOperation|ifPlayerCharacter|ifOpponentCharacter|ifCharaID|ifOnFrame|ifPlayerAlive|ifEnemyPlayerAlive|ifGameMode|ifTrueInObject|ifNotInObject|ifOperationInObject|else|upon|beginState|beginSubroutine|postSubroutineBegin|runOnObject|addMove|dramaticSetBegin)\b/.test(line)) {
      const name = line.match(/^(\w+)/)[1];
      stack.push({ name, line: lineNum });
      continue;
    }

    // ✅ BLOCK END
    if (/^(endIf|endElse|endUpon|endState|endSubroutine|endRunOnObject|endMove|dramaticSetEnd)\b/.test(line)) {
      if (stack.length === 0) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            "Unexpected block end",
            vscode.DiagnosticSeverity.Error
          )
        );
        continue;
      }

      const last = stack.pop();

      const expected = {
        "if": "endIf",
        "ifNot": "endIf",
        "ifOperation": "endIf",
        "ifPlayerCharacter": "endIf",
        "ifOpponentCharacter": "endIf",
        "ifCharaID": "endIf",
        "ifOnFrame": "endIf",
        "ifPlayerAlive": "endIf",
        "ifEnemyPlayerAlive": "endIf",
        "ifGameMode": "endIf",
        "ifTrueInObject": "endIf",
        "ifNotInObject": "endIf",
        "ifOperationInObject": "endIf",
        "else": "endElse",
        "upon": "endUpon",
        "beginState": "endState",
        "postSubroutineBegin": "endSubroutine",
        "beginSubroutine": "endSubroutine",
        "runOnObject": "endRunOnObject",
        "addMove": "endMove",
        "dramaticSetBegin": "dramaticSetEnd"
      };

      const actual = line.match(/^(\w+)/)[1];

      if (expected[last.name] !== actual) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            `Mismatched block end (expected ${expected[last.name]})`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }


    // ✅ s32 STRING VALIDATION
    const s32Match = line.match(/^\s*(\w+):\s*s32'([^']+)'/);
    if (s32Match) {
      const command = s32Match[1];
      const value = s32Match[2];

      const text = document.getText();

      let valid = true;

      // ✅ Label commands
      if ([
        "gotoLabel",
        "gotoLabelIf",
        "gotoLabelIfNot",
        "gotoLabelRequests",
        "gotoLabelUpon"
      ].includes(command)) {
        valid = new RegExp(`beginLabel:\\s*s32'${value}'`).test(text);
      }

      // ✅ State commands
      if ([
        "jumpToState",
        "jumpToStateIfNotSame",
        "jumpToStateIfNot",
        "jumpToStateKeepDamage",
        "findState",
        "addMove",
        "moveAlias",
      ].includes(command)) {

        // ✅ special engine state
        if (value === "_NEUTRAL") {
          valid = true;
        } else {
          valid = new RegExp(`beginState:\\s*s32'${value}'`).test(text);
        }
      }

      // ✅ Subroutine commands
      if ([
        "callSubroutine",
        "callSubroutineWithArgs",
        "preSubroutineBegin",
        "postSubroutineBegin"
      ].includes(command)) {

        
        // ✅ FULLY SKIP cmn subroutines
        if (value.startsWith("cmn")) {
          valid = true;
        } else {
          valid = new RegExp(`beginSubroutine:\\s*s32'${value}'`).test(text);
        }
      }


      if (!valid) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            `Unknown reference: ${value}`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }

    
    // ✅ MEM VARIABLE VALIDATION (FIXED)
    const memMatches = [...rawLine.matchAll(/Mem\(\s*([^)]+?)\s*\)/g)];

    for (const m of memMatches) {
      const varName = m[1].trim();

      // ✅ skip nested expressions like Mem(Val(...))
      if (varName.includes("(")) continue;

      // ✅ skip numeric values
      if (/^\d+$/.test(varName)) continue;

      if (!(varName in variables)) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(lineNum, 0, lineNum, rawLine.length),
            `Unknown variable: ${varName}`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }


    // ✅ UNFINISHED SYNTAX VALIDATION

    // 🔴 Unclosed Mem(
    if (/Mem\(\s*[^)]*$/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed Mem(...)",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

    // 🔴 Unclosed Enum (
    if (/\(\s*[^)]*$/.test(rawLine) && !/Mem\(/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed enum parentheses",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

    // 🔴 Unclosed string s32' or s16'
    if (/s(32|16)'\s*[^']*$/.test(rawLine)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(lineNum, 0, lineNum, rawLine.length),
          "Unclosed string literal",
          vscode.DiagnosticSeverity.Error
        )
      );
    }

  }

  
  
  



  // ✅ UNMATCHED BLOCKS
  for (const item of stack) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(item.line, 0, item.line, lines[item.line].length),
        `Missing end for ${item.name}`,
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  return diagnostics;
}


// ✅ =============================
// ✅ ACTIVATE
// ✅ =============================
function activate(context) {
  console.log("✅ BBScript extension active");

  
  const sidebarProvider = new SidebarViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "bbscript.sidebar",
      sidebarProvider
    )
  );
  

  // Colision editor
  registerColEditor(context);

  const spriteLinkDecoration = vscode.window.createTextEditorDecorationType({
    textDecoration: "underline",
    cursor: "pointer"
  });

  function updateSpriteLinkDecorations(editor) {
    if (!editor || editor.document.languageId !== "bbscript") return;
    const colPath = resolveColFileForBbs(editor.document);
    if (!colPath) {
      editor.setDecorations(spriteLinkDecoration, []);
      return;
    }
    const names = readColEntryNames(colPath);
    const ranges = findSpriteReferences(editor.document)
      .filter((reference) => names.has(reference.name.toLowerCase()))
      .map((reference) => reference.range);
    editor.setDecorations(spriteLinkDecoration, ranges);
  }

  context.subscriptions.push(spriteLinkDecoration);
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.openSpriteInCol", async (bbsUri, spriteName) => {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(bbsUri));
      const colPath = resolveColFileForBbs(document);
      if (!colPath) {
        vscode.window.showWarningMessage(
          `Could not find COL_${getBbsCharacterCode(document)}.json for ${path.basename(document.uri.fsPath)}.`
        );
        return;
      }
      const names = readColEntryNames(colPath);
      if (!names.has(String(spriteName).toLowerCase())) {
        vscode.window.showWarningMessage(`No COL entry named ${spriteName} was found.`);
        return;
      }
      await vscode.commands.executeCommand(
        "bbscript.openColSprite",
        vscode.Uri.file(colPath),
        String(spriteName)
      );
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider("bbscript", {
      provideDocumentLinks(document) {
        const colPath = resolveColFileForBbs(document);
        if (!colPath) return [];
        const names = readColEntryNames(colPath);
        return findSpriteReferences(document)
          .filter((reference) => names.has(reference.name.toLowerCase()))
          .map((reference) => {
            const args = encodeURIComponent(JSON.stringify([
              document.uri.toString(),
              reference.name
            ]));
            const link = new vscode.DocumentLink(
              reference.range,
              vscode.Uri.parse(`command:bbscript.openSpriteInCol?${args}`)
            );
            link.tooltip = `Open ${reference.name} in COL Editor`;
            return link;
          });
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateSpriteLinkDecorations),
    vscode.workspace.onDidOpenTextDocument((document) => {
      const editor = vscode.window.visibleTextEditors.find(
        (candidate) => candidate.document.uri.toString() === document.uri.toString()
      );
      if (editor) updateSpriteLinkDecorations(editor);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.visibleTextEditors.find(
        (candidate) => candidate.document.uri.toString() === event.document.uri.toString()
      );
      if (editor) updateSpriteLinkDecorations(editor);
    })
  );
  vscode.window.visibleTextEditors.forEach(updateSpriteLinkDecorations);



  // ✅ PHASE 1 WORKFLOW COMMANDS
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.selectProjectFolder", () =>
      selectProjectCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.extractParse", () =>
      extractParseCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.setModFolder", () =>
      setModFolderCommand.run(context)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.setCharaFolder", () =>
      setCharaFolderCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.setSigSource", () =>
      setSigSourceCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.setRonOverride", () =>
      setRonOverrideCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.useDefaultRon", () =>
      useDefaultRonCommand.run(context)
    )
  );

  // optional sanity check command during development
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.debugRuntimeEnvironment", () => {
      getOutputChannel().show(true);
      getRuntimeEnvironment(context);
    })
  );

  // PHASE 2 DEBUG COMMANDS
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.debugAssetDiscovery", () =>
      debugAssetDiscoveryCommand.run(context)
    )
  );

  // PHASE 5 COMMANDS  
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.rebuildReinject", () =>
      rebuildReinjectCommand.run(context)
    )
  );

  // PHASE 6 COMMANDS  
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.package", () =>
      packageCommand.run(context)
    )
  );

  // PHASE 7 COMMANDS  
  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.deploy", () =>
      deployCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.rebuildPackage", () =>
      rebuildPackageCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.reformatFiles", () =>
      reformatCommand.run(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bbscript.fullDeploy", () =>
      fullDeployCommand.run(context)
    )
  );



  // ✅ =============================
  // ✅ MAIN COMPLETION PROVIDER
  // ✅ =============================
  const provider = vscode.languages.registerCompletionItemProvider(
    "bbscript",
    {
      provideCompletionItems(document, position) {

        const line = document.lineAt(position.line).text;
        const before = line.substring(0, position.character);

        if (/Mem\([^)]*$/.test(before) || /s32'[^']*$/.test(before)) {
          return [];
        }

        const range = document.getWordRangeAtPosition(position);
        const word = range ? document.getText(range) : "";

        const items = [];

        for (const id in instructions) {
          const instr = instructions[id];

          if (!instr.name) continue;
          if (word && !instr.name.startsWith(word)) continue;

          const item = new vscode.CompletionItem(
            instr.name,
            vscode.CompletionItemKind.Snippet
          );

          const snippet = buildSnippetText(instr);
          item.insertText = new vscode.SnippetString(snippet);

          if (range) item.range = range;

          item.filterText = instr.name;
          item.detail = instr.desc;
          item.documentation = new vscode.MarkdownString(instr.desc);

          items.push(item);
        }

        return items;
      }
    },
    ".", ":", " "
  );


  // ✅ =============================
  // ✅ MEM PROVIDER
  // ✅ =============================
  const memProvider = vscode.languages.registerCompletionItemProvider(
    "bbscript",
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position.line).text;
        const before = line.substring(0, position.character);

        if (!/Mem\([^)]*$/.test(before)) return undefined;

        return Object.keys(variables).map(name => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Variable
          );
          item.insertText = name;
          return item;
        });
      }
    },
    "("
  );


  // ✅ =============================
  // ✅ s32 PROVIDER (your existing version)
  // ✅ =============================
  const s32Provider = vscode.languages.registerCompletionItemProvider(
    "bbscript",
    {
      provideCompletionItems(document, position) {

        const line = document.lineAt(position.line).text;
        const before = line.substring(0, position.character);

        if (!/s32'[^']*$/.test(before)) return undefined;

        const commandMatch = before.match(/^\s*(\w+):/);
        const command = commandMatch ? commandMatch[1] : "";

        const subroutineCommands = [
          "callSubroutine",
          "callSubroutineWithArgs",
          "preSubroutineBegin",
          "postSubroutineBegin",
          "moveCallSubroutine",
          "moveConditionCheckSubroutine"
        ];

        const stateCommands = [
          "jumpToState",
          "jumpToStateIfNotSame",
          "jumpToStateIfNot",
          "jumpToStateKeepDamage",
          "findState",
          "addMove",
          "moveAlias",
          "checkLastStateName",
          "checkLastAttackHitStateName",
          "checkCurrentStateName",
          "checkCurrentStateEntryName",
          "checkStateEntryNameCopyFrom",
          "stateEntryName"
        ];

        const labelCommands = [
          "gotoLabel",
          "gotoLabelRequests",
          "gotoLabelIf",
          "gotoLabelIfNot",
          "gotoLabelUpon"
        ];

        const spriteCommands = ["sprite"];

        if (spriteCommands.includes(command)) {
          const colPath = resolveColFileForBbs(document);
          if (!colPath) return [];

          let parsed;
          try {
            parsed = JSON.parse(fs.readFileSync(colPath, "utf8"));
          } catch {
            return [];
          }

          const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
          const prefixMatch = before.match(/s32'([^']*)$/);
          const typedPrefix = prefixMatch ? prefixMatch[1] : "";
          const replaceStart = position.translate(0, -typedPrefix.length);
          const replaceRange = new vscode.Range(replaceStart, position);

          return entries
            .map((entry) => typeof entry?.name === "string" ? entry.name : "")
            .filter(Boolean)
            .filter((name, index, all) =>
              all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index
            )
            .filter((name) =>
              !typedPrefix || name.toLowerCase().startsWith(typedPrefix.toLowerCase())
            )
            .sort((a, b) => a.localeCompare(b, undefined, {
              sensitivity: "base",
              numeric: true
            }))
            .map((name) => {
              const item = new vscode.CompletionItem(
                name,
                vscode.CompletionItemKind.File
              );
              item.insertText = name;
              item.range = replaceRange;
              item.filterText = name;
              item.sortText = "000_" + name.toLowerCase();
              item.detail = path.basename(colPath);
              item.documentation = new vscode.MarkdownString(
                `Sprite entry from ${path.basename(colPath)}`
              );
              return item;
            });
        }

        const text = document.getText();
        const results = [];

        if (subroutineCommands.includes(command)) {
          const regex = /beginSubroutine:\s*s32'([^']+)'/g;
          let match;
          while ((match = regex.exec(text))) results.push(match[1]);
        }

        if (stateCommands.includes(command)) {
          const regex = /beginState:\s*s32'([^']+)'/g;
          let match;
          while ((match = regex.exec(text))) results.push(match[1]);
        }

        if (labelCommands.includes(command)) {
          const regex = /beginLabel:\s*s32'([^']+)'/g;
          let match;
          while ((match = regex.exec(text))) results.push(match[1]);
        }

        return results.map(name => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Constant
          );
          item.insertText = name;
          item.sortText = "000_" + name;
          return item;
        });
      }
    },
    "'"
  );


  // ✅ =============================
  // ✅ ✅ ✅ NEW: DIAGNOSTICS WIRING
  // ✅ =============================
  const diagnosticCollection = vscode.languages.createDiagnosticCollection("bbscript");

  function updateDiagnostics(document) {
    if (document.languageId !== "bbscript") return;

    const diagnostics = validateDocument(document);
    diagnosticCollection.set(document.uri, diagnostics);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document))
  );

  vscode.workspace.textDocuments.forEach(updateDiagnostics);


  // ✅ REGISTER PROVIDERS
  context.subscriptions.push(provider);
  context.subscriptions.push(memProvider);
  context.subscriptions.push(s32Provider);
}


function deactivate() {}

module.exports = {
  activate,
  deactivate
};