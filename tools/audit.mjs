import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// A last look at the edition before the page is drawn: every story placed once,
// every placement backed by a story of the same day, and the rails the right
// length. Nothing here renders anything.
const tools = resolve("tools");
const edition = JSON.parse(readFileSync(resolve(tools, "edition.json"), "utf8"));
const words = JSON.parse(readFileSync(resolve(tools, "words.json"), "utf8"));

const complaints = [];
const complain = (line) => complaints.push(line);

if (edition.day !== "2026-11-24") complain("edition day is " + edition.day);
if (edition.stories.length !== 28) complain("edition holds " + edition.stories.length + " stories");

const known = new Map();
for (const story of edition.stories) {
  if (known.has(story.n)) complain("story " + story.n + " repeats in the edition");
  known.set(story.n, story);
  if (!Array.isArray(story.links) || story.links.length === 0) complain("story " + story.n + " carries no link");
}

const rails = [
  ["leads", words.leads, 3],
  ["cards", words.cards, 10],
  ["briefs", words.briefs, 15],
];
const placed = new Set();
for (const [name, items, want] of rails) {
  if (!Array.isArray(items) || items.length !== want) complain(name + " holds " + (items || []).length + ", wanted " + want);
  for (const item of items || []) {
    if (!known.has(item.n)) complain(name + " places unknown story " + item.n);
    if (placed.has(item.n)) complain("story " + item.n + " is placed twice");
    placed.add(item.n);
    if (!item.p || !String(item.p).trim()) complain(name + " story " + item.n + " has no copy");
  }
}
for (const n of known.keys()) if (!placed.has(n)) complain("story " + n + " is left off the page");
for (const n of placed) if (!known.has(n)) complain("story " + n + " is on the page but not in the edition");

if (!Array.isArray(words.figures) || words.figures.length !== 10) complain("the numbers panel holds " + (words.figures || []).length);
const mapLabels = Array.isArray(words.labels) ? words.labels : Object.values(words.labels || {});
if (mapLabels.length < 1) complain("the map has no labels");

if (complaints.length > 0) {
  for (const line of complaints) console.error("audit: " + line);
  process.exit(1);
}
const day = edition.day;
console.log("AUDIT: " + placed.size + " stories placed once each on " + day + ", " + words.figures.length + " numbers, " + mapLabels.length + " map label set(s)");