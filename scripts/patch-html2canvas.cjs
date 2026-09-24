const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/html2canvas/dist/html2canvas.js',
  'node_modules/html2canvas/dist/html2canvas.esm.js',
  'node_modules/html2canvas/dist/npm/css/types/color.js',
];

const targetStr = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");';
const replacement = 'return typeof COLORS !== "undefined" ? COLORS.TRANSPARENT : 0;';

for (const relPath of filesToPatch) {
  const filePath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[patch-html2canvas] Successfully patched ' + relPath);
  } else if (content.includes(replacement)) {
    console.log('[patch-html2canvas] Already patched ' + relPath);
  } else {
    console.log('[patch-html2canvas] Target not found in ' + relPath);
  }
}

