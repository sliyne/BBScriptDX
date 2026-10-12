const fs = require("fs");

function parseGGSTR(filePath) {
  const text = fs.readFileSync(filePath, "utf8");

  const instructions = {};
  const variables = {};

  // ✅ ----------------------------
  // PARSE INSTRUCTIONS BLOCK
  // ✅ ----------------------------

  const instrStart = text.indexOf("instructions:");
  if (instrStart === -1) {
    console.error("❌ instructions block not found");
    return { instructions, variables };
  }

  const openIndex = text.indexOf("{", instrStart);

  let depth = 0;
  let endIndex = openIndex;

  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;

    if (depth === 0) {
      endIndex = i;
      break;
    }
  }

  const block = text.slice(openIndex + 1, endIndex);

  // ✅ ----------------------------
  // PARSE EACH INSTRUCTION SAFELY
  // ✅ ----------------------------

  let i = 0;

  while (i < block.length) {
    const idMatch = block.slice(i).match(/(\d+):\s*\(/);

    if (!idMatch) break;

    const id = Number(idMatch[1]);
    const start = i + idMatch.index;

    const bodyStart = block.indexOf("(", start);

    let depth = 1;
    let j = bodyStart + 1;

    while (j < block.length && depth > 0) {
      if (block[j] === "(") depth++;
      if (block[j] === ")") depth--;
      j++;
    }

    const body = block.slice(bodyStart + 1, j - 1);

    // ✅ extract name
    const nameMatch = body.match(/name:\s*"([^"]+)"/);
    if (!nameMatch) {
      i = j;
      continue;
    }

    const name = nameMatch[1];

    // ✅ ----------------------------
    // PARSE args FIXED
    // ✅ ----------------------------

    const argsMatch = body.match(/args:\s*\[([\s\S]*?)\]/);

    let args = [];

    if (argsMatch) {
      const rawArgs = argsMatch[1]
        .split(",")
        .map(a => a.trim())
        .filter(Boolean);

      args = rawArgs.map(arg => {

        // Enum("UPON")
        const enumMatch = arg.match(/^Enum\("([^"]+)"\)$/);
        if (enumMatch) {
          return {
            type: "Enum",
            enumName: enumMatch[1]
          };
        }

        if (/^AccessedValue/.test(arg)) {
          return { type: "AccessedValue" };
        }

        if (/^Number/.test(arg)) {
          return { type: "Number" };
        }

        if (/^String/.test(arg)) {
          return { type: "String" };
        }

        return {
          type: "Unknown",
          raw: arg
        };
      });
    }

    instructions[id] = {
      name,
      args
    };

    i = j;
  }

  // ✅ ----------------------------
  // PARSE VARIABLES (unchanged)
  // ✅ ----------------------------

  const varBlockMatch = text.match(/named_variables:\s*\{([\s\S]*?)\}/);

  if (varBlockMatch) {
    const varRegex = /(\d+)\s*:\s*"([^"]+)"/g;

    let vm;
    while ((vm = varRegex.exec(varBlockMatch[1]))) {
      const id = Number(vm[1]);
      const name = vm[2];

      variables[name] = { id };
    }
  } else {
    console.warn("⚠ named_variables block not found");
  }

  console.log(`✅ Parsed ${Object.keys(instructions).length} instructions`);
  console.log(`✅ Parsed ${Object.keys(variables).length} variables`);

  const enums = parseEnums(text);

  return { instructions, variables, enums };
}

module.exports = { parseGGSTR };


function parseEnums(text) {
  const enums = {};

  const startIndex = text.indexOf("named_value_maps:");
  if (startIndex === -1) {
    console.warn("⚠ named_value_maps not found");
    return enums;
  }

  const openIndex = text.indexOf("{", startIndex);

  let depth = 0;
  let endIndex = openIndex;

  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;

    if (depth === 0) {
      endIndex = i;
      break;
    }
  }

  const block = text.slice(openIndex + 1, endIndex);

  let i = 0;

  while (i < block.length) {
    const nameMatch = block.slice(i).match(/"([^"]+)"\s*:/);
    if (!nameMatch) break;

    const enumName = nameMatch[1];
    const nameStart = i + nameMatch.index;

    const bodyStart = block.indexOf("{", nameStart);
    if (bodyStart === -1) break;

    let depth = 1;
    let j = bodyStart + 1;

    while (j < block.length && depth > 0) {
      if (block[j] === "{") depth++;
      if (block[j] === "}") depth--;
      j++;
    }

    const body = block.slice(bodyStart + 1, j - 1);

    const values = [];
    const valueRegex = /\d+\s*:\s*"([^"]+)"/g;

    let vMatch;
    while ((vMatch = valueRegex.exec(body))) {
      values.push(vMatch[1]);
    }

    enums[enumName] = values;

    i = j;
  }

  console.log(`✅ Parsed ${Object.keys(enums).length} enum groups`);

  return enums;
}