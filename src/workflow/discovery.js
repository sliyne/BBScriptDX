const fs = require("fs");
const path = require("path");
const { getUassetsRoot, getBbsRoot, getBbscriptRoot } = require("./paths");

/**
 * Recursively walks a directory and returns all file paths.
 */
function walkFiles(dir) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Classifies supported .uasset filenames.
 *
 * Supported:
 * - BBS_SOL.uasset       -> SOL.bbs
 * - BBS_SOLEF.uasset     -> SOLEF.bbs
 * - COL_SOL.uasset       -> COL_SOL.json (visible) + COL_SOL.pac (raw)
 */
function classifyAsset(fileName) {
  let match;

  // BBS_SOLEF.uasset or BBS_SOLEF_301.uasset
  match = fileName.match(/^BBS_([A-Z0-9]+EF(?:_\d+)?)\.uasset$/i);
  if (match) {
    const sourceBaseName = fileName.replace(/\.uasset$/i, "");
    return {
      kind: "bbs",
      sourceType: "bbs-ef",
      outputFileName: `${match[1]}.bbs`,
      rawFileName: `${sourceBaseName}.bbscript`,
      sourceBaseName
    };
  }

  // BBS_SOL.uasset or BBS_SOL_301.uasset
  match = fileName.match(/^BBS_([A-Z0-9]+(?:_\d+)?)\.uasset$/i);
  if (match) {
    const sourceBaseName = fileName.replace(/\.uasset$/i, "");
    return {
      kind: "bbs",
      sourceType: "bbs-main",
      outputFileName: `${match[1]}.bbs`,
      rawFileName: `${sourceBaseName}.bbscript`,
      sourceBaseName
    };
  }

  // COL_SOL.uasset or COL_SOL_301.uasset
  match = fileName.match(/^COL_([A-Z0-9]+(?:_\d+)?)\.uasset$/i);
  if (match) {
    const sourceBaseName = fileName.replace(/\.uasset$/i, "");
    return {
      kind: "col",
      sourceType: "col",
      outputFileName: `${sourceBaseName}.json`,
      rawFileName: `${sourceBaseName}.pac`,
      sourceBaseName
    };
  }

  return null;
}

/**
 * Extracts BBScript-relevant path info from a RED-style path under UASSETS.
 *
 * Expected shapes:
 * - UASSETS/RED/Content/Chara/SOL/Common/Data/BBS_SOL.uasset
 * - UASSETS/RED/Content/Chara/SOL/Common/Data/101/BBS_SOL.uasset
 *
 * Output directory becomes:
 * - BBS Files/SOL/
 * - BBS Files/SOL/101/
 *
 * If the RED path shape is not found, falls back to mirroring the
 * directory structure under UASSETS.
 */
function getProjectRelativeParts(uassetsRoot, uassetPath) {
  const relativePath = path.relative(uassetsRoot, uassetPath);
  const parts = relativePath.split(path.sep);

  const contentIndex = parts.findIndex(
    p => p.toLowerCase() === "content"
  );

  const charaIndex =
    contentIndex >= 0 && parts[contentIndex + 1]?.toLowerCase() === "chara"
      ? contentIndex + 1
      : -1;

  if (charaIndex >= 0) {
    const charCode = parts[charaIndex + 1];
    const relativeOutputDirParts = [charCode];

    const dataIndex = parts.findIndex(
      (p, index) =>
        index > charaIndex && p.toLowerCase() === "data"
    );

    if (dataIndex >= 0) {
      const betweenDataAndFile = parts.slice(dataIndex + 1, parts.length - 1);
      relativeOutputDirParts.push(...betweenDataAndFile);
    }

    return {
      charCode,
      relativeOutputDirParts
    };
  }

  // Fallback: mirror whatever folder structure exists under UASSETS
  const fallbackDir = path.dirname(relativePath);
  const fallbackParts =
    fallbackDir === "." ? [] : fallbackDir.split(path.sep);

  return {
    charCode: fallbackParts[0] || "UNKNOWN",
    relativeOutputDirParts: fallbackParts
  };
}

/**
 * Builds one discovered asset entry.
 */
function buildAssetEntry(projectRoot, uassetPath) {
  const uassetsRoot = getUassetsRoot(projectRoot);
  const bbsRoot = getBbsRoot(projectRoot);
  const bbscriptRoot = getBbscriptRoot(projectRoot);

  const fileName = path.basename(uassetPath);
  const classification = classifyAsset(fileName);

  if (!classification) {
    return null;
  }

  const uexpPath = uassetPath.replace(/\.uasset$/i, ".uexp");
  const hasUexp = fs.existsSync(uexpPath);

  const { charCode, relativeOutputDirParts } = getProjectRelativeParts(
    uassetsRoot,
    uassetPath
  );

  const visibleOutputDir = path.join(bbsRoot, ...relativeOutputDirParts);
  const rawOutputDir = path.join(bbscriptRoot, ...relativeOutputDirParts);

  const outputFile = path.join(visibleOutputDir, classification.outputFileName);

  let bbscriptFile = null;
  let bbscriptFileName = null;

  let pacFile = null;
  let pacFileName = null;

  if (classification.kind === "bbs") {
    bbscriptFileName = classification.rawFileName;
    bbscriptFile = path.join(rawOutputDir, bbscriptFileName);
  }

  if (classification.kind === "col") {
    pacFileName = classification.rawFileName;
    pacFile = path.join(rawOutputDir, pacFileName);
  }

  return {
    kind: classification.kind,              // "bbs" or "col"
    sourceType: classification.sourceType,  // "bbs-main" | "bbs-ef" | "col"
    charCode,
    relativeOutputDir: path.join(...relativeOutputDirParts),
    sourceUasset: uassetPath,
    sourceUexp: uexpPath,
    hasUexp,

    // Visible user-facing output
    outputFile,
    outputFileName: classification.outputFileName,

    // Raw extracted outputs
    bbscriptFile,
    bbscriptFileName,
    pacFile,
    pacFileName,

    sourceBaseName: classification.sourceBaseName
  };
}

/**
 * Discovers all supported BBScript-related assets in the project UASSETS folder.
 *
 * Returns:
 * {
 *   validAssets: [...],
 *   missingPairs: [...]
 * }
 */
function discoverAssets(projectRoot) {
  const uassetsRoot = getUassetsRoot(projectRoot);

  const allFiles = walkFiles(uassetsRoot);
  const uassetFiles = allFiles.filter(file =>
    file.toLowerCase().endsWith(".uasset")
  );

  const validAssets = [];
  const missingPairs = [];

  for (const uassetPath of uassetFiles) {
    const entry = buildAssetEntry(projectRoot, uassetPath);

    if (!entry) {
      continue;
    }

    if (entry.hasUexp) {
      validAssets.push(entry);
    } else {
      missingPairs.push(entry);
    }
  }

  return {
    validAssets,
    missingPairs
  };
}

module.exports = {
  discoverAssets,
  classifyAsset,
  getProjectRelativeParts
};