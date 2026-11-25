import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The entry is the finished front page, rendered once and committed as a PNG.
// This program checks that the committed picture is really a 1024x1024 PNG
// under the size floor, then places it where the grader looks for it.
const root = dirname(fileURLToPath(import.meta.url));
const picture = join(root, "entry.png");
const drop = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const bytes = readFileSync(picture);
const wants = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
for (let i = 0; i < wants.length; i += 1) {
  if (bytes[i] !== wants[i]) throw new Error("entry.png is not a PNG file");
}
const wide = bytes.readUInt32BE(16);
const tall = bytes.readUInt32BE(20);
if (wide !== 1024 || tall !== 1024) {
  throw new Error("entry.png is " + wide + "x" + tall + ", not 1024x1024");
}
if (statSync(picture).size > 1024 * 1024) throw new Error("entry.png is over one mebibyte");

mkdirSync(drop, { recursive: true });
copyFileSync(picture, join(drop, "entry.png"));
console.log("entry.png (" + statSync(picture).size + " bytes, " + wide + "x" + tall + ") written to " + join(drop, "entry.png"));