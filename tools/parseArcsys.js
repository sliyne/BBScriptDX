const fs = require("fs");

function parseArcsys(filePath) {
  const text = fs.readFileSync(filePath, "utf8");

  const instructions = {};

  // ✅ Match JSON-style entries like:
  // "640": { ... "desc": "..." }
  const regex = /"(\d+)"\s*:\s*\{([\s\S]*?)\}/g;

  let match;

  while ((match = regex.exec(text))) {
    const id = Number(match[1]);
    const body = match[2];

    // ✅ extract desc
    const descMatch = body.match(/"desc"\s*:\s*"([\s\S]*?)"/);

    if (descMatch) {
      const desc = descMatch[1].replace(/\\n/g, "\n");

      instructions[id] = {
        desc
      };
    }
  }

  console.log(`✅ Parsed ${Object.keys(instructions).length} descriptions`);

  return instructions;
}

module.exports = { parseArcsys };