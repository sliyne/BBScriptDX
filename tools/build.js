const fs = require("fs-extra");
const path = require("path");
const fallbackDescriptions = require("../data/idNameWithDescription.json");

const { parseGGSTR } = require("./parseGGSTR.js");
const { parseArcsys } = require("./parseArcsys.js");

const ggstrPath = path.join(__dirname, "../data/GGSTRonRemake.ron");
const arcsysPath = path.join(__dirname, "../data/ArcsysRonGGST.ron");

const outputDir = path.join(__dirname, "../generated");

function build() {
  console.log("Parsing GGSTRonRemake...");
  const { instructions: ggstrInstr, variables, enums } = parseGGSTR(ggstrPath);

  console.log("Parsing ArcsysRon...");
  const arcsysInstr = parseArcsys(arcsysPath);

  console.log("Merging datasets...");

  const merged = {};
  const nameToID = {};
  const idToName = {};
  const varIDToName = {};

  // ✅ Merge instructions
  for (const id in ggstrInstr) {
    const instr = ggstrInstr[id];

    merged[id] = {
      name: instr.name,
      args: instr.args,
      desc: arcsysInstr[id]?.desc || ""
    };

    nameToID[instr.name] = Number(id);
    idToName[id] = instr.name;
  }
  
  // ✅ Fill missing descriptions using fallback file
  for (const id in merged) {
    if (!merged[id].desc || merged[id].desc.trim() === "") {
      if (fallbackDescriptions[id]) {
        merged[id].desc = fallbackDescriptions[id].desc;
      } else {
        merged[id].desc = "DESCRIPTION MISSING";
      }
    }

    merged[id].desc = merged[id].desc.replace(/\n/g, "\n\n");
  }


  // ✅ Build reverse variable map
  for (const name in variables) {
    varIDToName[variables[name].id] = name;
  }

  fs.ensureDirSync(outputDir);

  fs.writeJsonSync(path.join(outputDir, "instructions.json"), merged, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, "variables.json"), variables, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, "idToName.json"), idToName, { spaces: 2 });
  fs.writeJsonSync(path.join(outputDir, "varIDToName.json"), varIDToName, { spaces: 2 });  
  fs.writeJsonSync(path.join(outputDir, "enums.json"),enums,{ spaces: 2 });


  console.log("✅ Build complete!");
}

build();