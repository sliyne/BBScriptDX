const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const vscode = require("vscode");
const {
  getBundledHelperPath,
  getBundledRonPath,
  getBundledPacToJsonPath,
  getBundledJsonToPacPath,
  getUassetsRoot,
  getBbsRoot,
  getPackagesRoot
} = require("./paths");
const {
  getRonOverride,
  getModFolder,
  getSigSource,
  getOverwriteRebuild,
  getOverwritePackage,
  getOverwriteDeploy,
  getOverwriteRebuildPackage,
  getOverwriteFullDeploy
} = require("./settings");
const { error, log, info, warn, show } = require("./output");
const { discoverAssets } = require("./discovery");

function resolveRonPath(context) {
  const override = getRonOverride(context);

  if (override) {
    if (!fs.existsSync(override)) {
      error(`Configured .ron override not found: ${override}`);
      return null;
    }
    return override;
  }

  const defaultRon = getBundledRonPath(context);
  if (!fs.existsSync(defaultRon)) {
    error(`Bundled default.ron not found: ${defaultRon}`);
    return null;
  }

  return defaultRon;
}

function resolveHelperPath(context) {
  const helperPath = getBundledHelperPath(context);

  if (!fs.existsSync(helperPath)) {
    error(`Bundled helper not found: ${helperPath}`);
    return null;
  }

  return helperPath;
}

function resolvePacToJsonPath(context) {
  const converterPath = getBundledPacToJsonPath(context);

  if (!fs.existsSync(converterPath)) {
    error(`Bundled pac_to_json converter not found: ${converterPath}`);
    return null;
  }

  return converterPath;
}

function resolveJsonToPacPath(context) {
  const converterPath = getBundledJsonToPacPath(context);

  if (!fs.existsSync(converterPath)) {
    error(`Bundled json_to_pac converter not found: ${converterPath}`);
    return null;
  }

  return converterPath;
}

function getRuntimeEnvironment(context) {
  const helperPath = resolveHelperPath(context);
  const ronPath = resolveRonPath(context);

  if (!helperPath || !ronPath) {
    return null;
  }

  log(`Runtime helper: ${helperPath}`);
  log(`Using ron: ${ronPath}`);

  return {
    helperPath,
    ronPath
  };
}

function findExistingExtractOutputs(validAssets) {
  const existing = new Set();

  for (const asset of validAssets) {
    for (const candidate of [
      asset.outputFile,
      asset.bbscriptFile,
      asset.pacFile
    ]) {
      if (candidate && fs.existsSync(candidate)) {
        existing.add(candidate);
      }
    }
  }

  return [...existing];
}

function getProjectEditablePath(asset) {
  // BBS edits come from visible .bbs
  // COL edits come from visible .json
  return asset.outputFile;
}

function findExistingProjectFiles(validAssets) {
  return validAssets.filter(asset => {
    const projectFile = getProjectEditablePath(asset);
    return !!projectFile && fs.existsSync(projectFile);
  });
}

function runHelperJson(context, payload) {
  return new Promise((resolve, reject) => {
    const env = getRuntimeEnvironment(context);
    if (!env) {
      reject(new Error("Runtime environment is not ready."));
      return;
    }

    const child = spawn(env.helperPath, [], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", err => {
      reject(err);
    });

    child.on("close", code => {
      if (stderr.trim()) {
        log(`[helper stderr]\n${stderr.trim()}`);
      }

      if (code !== 0) {
        reject(new Error(`Helper exited with code ${code}`));
        return;
      }

      try {
        const parsed = stdout.trim() ? JSON.parse(stdout) : {};
        resolve(parsed);
      } catch (err) {
        reject(
          new Error(
            `Failed to parse helper JSON response.\nRaw output:\n${stdout}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function runCliConverter(exePath, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", err => {
      reject(err);
    });

    child.on("close", code => {
      if (code !== 0) {
        reject(
          new Error(
            `${label} exited with code ${code}\n${stderr || stdout}`.trim()
          )
        );
        return;
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function syncColJsonOutputs(context, assets, phaseLabel) {
  const pacToJsonPath = resolvePacToJsonPath(context);
  if (!pacToJsonPath) {
    throw new Error("PAC -> JSON converter is not available.");
  }

  const colAssets = assets.filter(
    asset => asset.kind === "col" && asset.pacFile && asset.outputFile
  );

  for (const asset of colAssets) {
    const jsonDir = path.dirname(asset.outputFile);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    log(
      `${phaseLabel}: Converting COL PAC -> JSON: ${asset.pacFile} -> ${asset.outputFile}`
    );

    const result = await runCliConverter(
      pacToJsonPath,
      [asset.pacFile, asset.outputFile],
      "pac_to_json"
    );

    if (result.stdout) {
      log(`[pac_to_json stdout] ${result.stdout}`);
    }
    if (result.stderr) {
      log(`[pac_to_json stderr] ${result.stderr}`);
    }
  }
}

async function rebuildColPacsFromJson(context, assets) {
  const jsonToPacPath = resolveJsonToPacPath(context);
  if (!jsonToPacPath) {
    throw new Error("JSON -> PAC converter is not available.");
  }

  const colAssets = assets.filter(
    asset => asset.kind === "col" && asset.pacFile && asset.outputFile
  );

  for (const asset of colAssets) {
    const pacDir = path.dirname(asset.pacFile);
    if (!fs.existsSync(pacDir)) {
      fs.mkdirSync(pacDir, { recursive: true });
    }

    log(`Converting COL JSON -> PAC: ${asset.outputFile} -> ${asset.pacFile}`);

    const result = await runCliConverter(
      jsonToPacPath,
      [asset.outputFile, asset.pacFile],
      "json_to_pac"
    );

    if (result.stdout) {
      log(`[json_to_pac stdout] ${result.stdout}`);
    }
    if (result.stderr) {
      log(`[json_to_pac stderr] ${result.stderr}`);
    }
  }
}

async function extractParse(context, projectRoot) {
  const env = getRuntimeEnvironment(context);
  if (!env) {
    return false;
  }

  const discovery = discoverAssets(projectRoot);

  if (discovery.missingPairs.length > 0) {
    const message =
      `Some source pairs are incomplete.\n\n` +
      `${discovery.missingPairs.length} item(s) are missing matching .uexp files.\n` +
      `Do you want to continue and skip them?`;

    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Continue and Skip Missing"
    );

    if (choice !== "Continue and Skip Missing") {
      warn("Extract + Parse canceled because required source pairs were missing.");
      return false;
    }
  }

  if (discovery.validAssets.length === 0) {
    warn("No valid BBScript-related assets were found in UASSETS.");
    return false;
  }

  const existingOutputs = findExistingExtractOutputs(discovery.validAssets);
  let overwriteProjectFiles = false;

  if (existingOutputs.length > 0) {
    const warningMessage =
      `Extract + Parse will overwrite ${existingOutputs.length} existing file(s) inside your BBScript project.\n\n` +
      `This may replace visible files in "BBS Files" and raw files in ".bbscript Files".\n\n` +
      `Do you want to continue?`;

    const choice = await vscode.window.showWarningMessage(
      warningMessage,
      { modal: true },
      "Continue"
    );

    if (choice !== "Continue") {
      warn("Extract + Parse canceled by user.");
      return false;
    }

    overwriteProjectFiles = true;
  }

  for (const asset of discovery.validAssets) {
    const outputDir = path.dirname(asset.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (asset.bbscriptFile) {
      const bbscriptDir = path.dirname(asset.bbscriptFile);
      if (!fs.existsSync(bbscriptDir)) {
        fs.mkdirSync(bbscriptDir, { recursive: true });
      }
    }

    if (asset.pacFile) {
      const pacDir = path.dirname(asset.pacFile);
      if (!fs.existsSync(pacDir)) {
        fs.mkdirSync(pacDir, { recursive: true });
      }
    }
  }

  const payload = {
    command: "extract-parse",
    project_root: projectRoot,
    uassets_root: getUassetsRoot(projectRoot),
    bbs_root: getBbsRoot(projectRoot),
    ron_path: env.ronPath,
    overwrite_project_files: overwriteProjectFiles,
    assets: discovery.validAssets.map(asset => ({
      kind: asset.kind,
      source_type: asset.sourceType,
      source_uasset: asset.sourceUasset,
      source_uexp: asset.sourceUexp,
      output_file: asset.outputFile,
      bbscript_output_file: asset.kind === "bbs" ? asset.bbscriptFile : null,
      pac_output_file: asset.kind === "col" ? asset.pacFile : null
    }))
  };

  show();
  log("=== Extract + Parse ===");
  log(`Project: ${projectRoot}`);
  log(`Valid assets: ${discovery.validAssets.length}`);
  log(`Missing pairs skipped: ${discovery.missingPairs.length}`);
  log(`Using ron: ${env.ronPath}`);
  log(`Overwrite project files: ${overwriteProjectFiles}`);

  try {
    const ok = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "BBScript: Extract + Parse",
        cancellable: false
      },
      async () => {
        const result = await runHelperJson(context, payload);

        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(line => log(line));
        }

        if (result.processed && Array.isArray(result.processed)) {
          result.processed.forEach(item => {
            log(`Processed: ${item.source || item.output || JSON.stringify(item)}`);
          });
        }

        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          result.errors.forEach(err => log(`[runtime error] ${JSON.stringify(err)}`));
        }

        if (!result.ok) {
          error("Extract + Parse finished with errors. See BBScript Tools output.");
          return false;
        }

        await syncColJsonOutputs(context, discovery.validAssets, "Extract + Parse");

        info("Extract + Parse completed.");
        return true;
      }
    );

    return !!ok;
  } catch (err) {
    error(`Extract + Parse failed: ${err.message}`);
    return false;
  }
}

async function rebuildReinject(context, projectRoot, options = {}) {
  const env = getRuntimeEnvironment(context);
  if (!env) {
    return false;
  }

  const discovery = discoverAssets(projectRoot);
  const overwriteEnabled =
    options.overwrite ?? getOverwriteRebuild(context);

  if (discovery.missingPairs.length > 0) {
    const message =
      `Some source pairs are incomplete.\n\n` +
      `${discovery.missingPairs.length} item(s) are missing matching .uexp files.\n` +
      `Do you want to continue and skip them?`;

    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Continue and Skip Missing"
    );

    if (choice !== "Continue and Skip Missing") {
      warn("Rebuild + Reinject canceled because required source pairs were missing.");
      return false;
    }
  }

  const existingProjectFiles = findExistingProjectFiles(discovery.validAssets);

  if (existingProjectFiles.length === 0) {
    warn("No rebuildable project files were found in BBS Files.");
    return false;
  }

  if (!overwriteEnabled) {
    const overwriteTargets = existingProjectFiles.flatMap(asset => [
      asset.sourceUasset,
      asset.sourceUexp
    ]);

    const warningMessage =
      `Rebuild + Reinject will overwrite ${overwriteTargets.length} existing file(s) in UASSETS.\n\n` +
      `This will write rebuilt data back into the project’s extracted game files.\n\n` +
      `Do you want to continue?`;

    const choice = await vscode.window.showWarningMessage(
      warningMessage,
      { modal: true },
      "Continue"
    );

    if (choice !== "Continue") {
      warn("Rebuild + Reinject canceled by user.");
      return false;
    }
  }

  show();
  log("=== Rebuild + Reinject ===");
  log(`Project: ${projectRoot}`);
  log(`Rebuildable files: ${existingProjectFiles.length}`);
  log(`Missing pairs skipped: ${discovery.missingPairs.length}`);
  log(`Using ron: ${env.ronPath}`);

  try {
    const ok = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "BBScript: Rebuild + Reinject",
        cancellable: false
      },
      async () => {
        // First rebuild visible COL JSON into the hidden raw PAC files
        await rebuildColPacsFromJson(context, existingProjectFiles);

        const payload = {
          command: "rebuild-reinject",
          project_root: projectRoot,
          uassets_root: getUassetsRoot(projectRoot),
          bbs_root: getBbsRoot(projectRoot),
          ron_path: env.ronPath,
          assets: existingProjectFiles.map(asset => ({
            kind: asset.kind,
            source_type: asset.sourceType,
            source_uasset: asset.sourceUasset,
            source_uexp: asset.sourceUexp,
            output_file: asset.kind === "col" ? asset.pacFile : asset.outputFile
          }))
        };

        const result = await runHelperJson(context, payload);

        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(line => log(line));
        }

        if (result.processed && Array.isArray(result.processed)) {
          result.processed.forEach(item => {
            log(`Processed: ${item.source || item.output || JSON.stringify(item)}`);
          });
        }

        if (result.skipped && Array.isArray(result.skipped) && result.skipped.length > 0) {
          result.skipped.forEach(item => {
            log(`[skipped] ${JSON.stringify(item)}`);
          });
        }

        if (result.missing && Array.isArray(result.missing) && result.missing.length > 0) {
          result.missing.forEach(item => {
            log(`[missing] ${JSON.stringify(item)}`);
          });
        }

        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          result.errors.forEach(err => log(`[runtime error] ${JSON.stringify(err)}`));
        }

        if (!result.ok) {
          error("Rebuild + Reinject finished with errors. See BBScript Tools output.");
          return false;
        }

        // Refresh visible COL JSON from the rebuilt/reinjected PACs
        await syncColJsonOutputs(context, existingProjectFiles, "Rebuild + Reinject");

        info("Rebuild + Reinject completed.");
        return true;
      }
    );

    return !!ok;
  } catch (err) {
    error(`Rebuild + Reinject failed: ${err.message}`);
    return false;
  }
}

async function packageProject(context, projectRoot, options = {}) {
  const env = getRuntimeEnvironment(context);
  if (!env) {
    return false;
  }

  const uassetsRoot = getUassetsRoot(projectRoot);
  const packagesRoot = getPackagesRoot(projectRoot);
  const redRoot = path.join(uassetsRoot, "RED");

  const overwriteEnabled =
    options.overwrite ?? getOverwritePackage(context);

  const packageName = path.basename(projectRoot);
  const pakPath = path.join(packagesRoot, `${packageName}.pak`);

  if (!fs.existsSync(redRoot)) {
    warn(`Cannot package because RED was not found: ${redRoot}`);
    return false;
  }

  if (!fs.existsSync(packagesRoot)) {
    fs.mkdirSync(packagesRoot, { recursive: true });
  }

  if (fs.existsSync(pakPath) && !overwriteEnabled) {
    const choice = await vscode.window.showWarningMessage(
      `A package already exists and will be overwritten.\n\n${pakPath}\n\nDo you want to continue?`,
      { modal: true },
      "Overwrite"
    );

    if (choice !== "Overwrite") {
      warn("Packaging canceled by user.");
      return false;
    }
  }

  const payload = {
    command: "package",
    project_root: projectRoot,
    uassets_root: uassetsRoot,
    packages_root: packagesRoot,
    package_name: packageName
  };

  show();
  log("=== Package ===");
  log(`Project: ${projectRoot}`);
  log(`UASSETS root: ${uassetsRoot}`);
  log(`Packages root: ${packagesRoot}`);
  log(`Package name: ${packageName}`);

  try {
    const ok = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "BBScript: Package",
        cancellable: false
      },
      async () => {
        const result = await runHelperJson(context, payload);

        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(line => log(line));
        }

        if (result.processed && Array.isArray(result.processed)) {
          result.processed.forEach(item => {
            log(`Processed: ${item.source || item.output || JSON.stringify(item)}`);
          });
        }

        if (result.missing && Array.isArray(result.missing) && result.missing.length > 0) {
          result.missing.forEach(item => {
            log(`[missing] ${JSON.stringify(item)}`);
          });
        }

        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          result.errors.forEach(err => log(`[runtime error] ${JSON.stringify(err)}`));
        }

        if (result.ok) {
          info("Package created successfully.");
          return true;
        } else {
          error("Packaging finished with errors. See BBScript Tools output.");
          return false;
        }
      }
    );

    return !!ok;
  } catch (err) {
    error(`Packaging failed: ${err.message}`);
    return false;
  }
}

async function deployPackage(context, projectRoot, options = {}) {
  const packagesRoot = getPackagesRoot(projectRoot);
  const modFolder = getModFolder(context);
  const sigSource = getSigSource(context);

  const overwriteEnabled =
    options.overwrite ?? getOverwriteDeploy(context);

  if (!modFolder) {
    warn("No mod folder selected. Use 'BBScript: Set Mod Folder' first.");
    return false;
  }

  if (!sigSource) {
    warn("No signature source selected. Use 'BBScript: Set Sig Source' first.");
    return false;
  }

  const packageName = path.basename(projectRoot);
  const sourcePak = path.join(packagesRoot, `${packageName}.pak`);
  const sourceSig = sigSource;

  if (!fs.existsSync(sourcePak)) {
    warn(`No packaged .pak found. Package the project first: ${sourcePak}`);
    return false;
  }

  if (!fs.existsSync(sourceSig)) {
    warn(`Selected .sig source does not exist: ${sourceSig}`);
    return false;
  }

  if (!fs.existsSync(modFolder)) {
    warn(`Selected mod folder does not exist: ${modFolder}`);
    return false;
  }

  const destinationFolder = path.join(modFolder, packageName);

  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  const destinationPak = path.join(destinationFolder, `${packageName}.pak`);
  const destinationSig = path.join(destinationFolder, `${packageName}.sig`);

  if (fs.existsSync(destinationPak) || fs.existsSync(destinationSig)) {
    if (!overwriteEnabled) {
      const choice = await vscode.window.showWarningMessage(
        `One or more deployed files already exist and will be overwritten.\n\n` +
          `${destinationPak}\n` +
          `${destinationSig}\n\n` +
          `Do you want to continue?`,
        { modal: true },
        "Overwrite"
      );

      if (choice !== "Overwrite") {
        warn("Deployment canceled by user.");
        return false;
      }
    }
  }

  show();
  log("=== Deploy ===");
  log(`Project: ${projectRoot}`);
  log(`Source pak: ${sourcePak}`);
  log(`Source sig: ${sourceSig}`);
  log(`Destination folder: ${destinationFolder}`);
  log(`Destination pak: ${destinationPak}`);
  log(`Destination sig: ${destinationSig}`);

  try {
    fs.copyFileSync(sourcePak, destinationPak);
    fs.copyFileSync(sourceSig, destinationSig);

    log(`Copied pak: ${destinationPak}`);
    log(`Copied sig: ${destinationSig}`);
    info("Deployment completed.");
    return true;
  } catch (err) {
    error(`Deployment failed: ${err.message}`);
    return false;
  }
}

async function reformatFiles(context, projectRoot) {
  show();
  log("=== Reformat Files ===");
  log(`Project: ${projectRoot}`);

  const rebuilt = await rebuildReinject(context, projectRoot);
  if (!rebuilt) {
    warn("Reformatting stopped during rebuild/reinject.");
    return false;
  }

  const parsed = await extractParse(context, projectRoot);
  if (!parsed) {
    warn("Reformatting stopped during extract/parse.");
    return false;
  }

  info("Reformatting completed.");
  return true;
}

async function rebuildAndPackage(context, projectRoot) {
  show();
  log("=== Rebuild + Package ===");
  log(`Project: ${projectRoot}`);

  const overwriteEnabled = getOverwriteRebuildPackage(context);

  const rebuilt = await rebuildReinject(context, projectRoot, {
    overwrite: overwriteEnabled
  });
  if (!rebuilt) {
    warn("Rebuild + Package stopped during rebuild/reinject.");
    return false;
  }

  const packaged = await packageProject(context, projectRoot, {
    overwrite: overwriteEnabled
  });
  if (!packaged) {
    warn("Rebuild + Package stopped during packaging.");
    return false;
  }

  info("Rebuild + Package completed.");
  return true;
}

async function fullDeploy(context, projectRoot) {
  show();
  log("=== Full Deploy ===");
  log(`Project: ${projectRoot}`);

  const overwriteEnabled = getOverwriteFullDeploy(context);

  const rebuilt = await rebuildReinject(context, projectRoot, {
    overwrite: overwriteEnabled
  });
  if (!rebuilt) {
    warn("Full Deploy stopped during rebuild/reinject.");
    return false;
  }

  const packaged = await packageProject(context, projectRoot, {
    overwrite: overwriteEnabled
  });
  if (!packaged) {
    warn("Full Deploy stopped during packaging.");
    return false;
  }

  const deployed = await deployPackage(context, projectRoot, {
    overwrite: overwriteEnabled
  });
  if (!deployed) {
    warn("Full Deploy stopped during deployment.");
    return false;
  }

  info("Full Deploy completed.");
  return true;
}

module.exports = {
  resolveRonPath,
  resolveHelperPath,
  resolvePacToJsonPath,
  resolveJsonToPacPath,
  getRuntimeEnvironment,
  runHelperJson,
  extractParse,
  reformatFiles,
  rebuildReinject,
  packageProject,
  deployPackage,
  rebuildAndPackage,
  fullDeploy
};