// verify.mjs — nothing on the page may be a fact the edition does not carry.
//
// Three passes: every number printed about a story must appear in that story's own record; every
// outlet named must be one the edition lists for it; and every qualitative claim in CLAIMS must
// be found, word for word, in the record. Exits 1 on the first kind of failure.
//
// Usage: node tools/verify.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (name) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
const edition = JSON.parse(read('./edition.json'));
const words = JSON.parse(read('./words.json'));

const flatten = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (typeof value === 'object') return Object.values(value).map(flatten).join(' ');
  return String(value);
};

// One story's whole record, as the edition states it.
const recordText = new Map(edition.stories.map((story) => {
  const { illustration, ...rest } = story;
  return [story.n, flatten(rest)];
}));

const tidy = (text) => text
  .toLowerCase()
  .replaceAll('\u2019', "'").replaceAll('\u2018', "'")
  .replaceAll('\u201c', '"').replaceAll('\u201d', '"')
  .replaceAll('\u2014', '-').replaceAll('\u2013', '-').replaceAll('\u2212', '-')
  .replace(/\s+/g, ' ');

const digitsOf = (text) => tidy(text).replace(/(\d),(?=\d{3})/g, '$1');

const problems = [];

// --- pass one: numbers ----------------------------------------------------------------------
// Every figure the page prints about a story has to be in that story's record. The page's own
// clock stamps are excluded: those are checked against the links in page.mjs.
const printedNumbers = (item) => {
  const text = [item.fig, item.unit, item.sub, item.deck, item.head, item.h, item.d, item.b, item.cap]
    .filter(Boolean).join(' ');
  return [...text.matchAll(/\d[\d,.]*/g)].map((match) => match[0]).filter((value) => !value.includes(':'));
};

const items = [...words.leads, ...words.cards, ...words.briefs];
for (const item of items) {
  const record = digitsOf(recordText.get(item.n) ?? '');
  for (const figure of printedNumbers(item)) {
    const bare = figure.replaceAll(',', '').replace(/\.$/, '');
    const spelled = figure.replace(/\.0+$/, '');
    if (!record.includes(bare) && !record.includes(spelled)) {
      problems.push(`story ${item.n} prints ${figure}, which its record does not hold`);
    }
  }
}

// --- pass two: outlets ----------------------------------------------------------------------
for (const item of items) {
  const record = tidy(recordText.get(item.n) ?? '');
  for (const outlet of String(item.s ?? '').split(/[·,]/).map((part) => part.trim()).filter(Boolean)) {
    const key = outlet.toLowerCase();
    if (!record.includes(key) && !record.includes(key.replace(/^the /, ''))) {
      problems.push(`story ${item.n} credits ${outlet}, which the edition does not list`);
    }
  }
}

// --- pass three: the claims that carry a story's meaning -------------------------------------
// [what the page prints, the story it belongs to, the words the edition records it with]
const CLAIMS = words.claims ?? [];
for (const [printed, n, recorded] of CLAIMS) {
  if (!tidy(recordText.get(n) ?? '').includes(tidy(recorded))) {
    problems.push(`story ${n} prints "${printed}", but its record does not say "${recorded}"`);
  }
}

// --- the edition itself ----------------------------------------------------------------------
const placed = items.map((item) => item.n);
if (placed.length !== edition.stories.length) {
  problems.push(`${placed.length} stories placed, the edition holds ${edition.stories.length}`);
}
if (new Set(placed).size !== placed.length) problems.push('a story is placed twice');
for (const story of edition.stories) {
  if (!placed.includes(story.n)) problems.push(`story ${story.n} is missing from the page`);
}

for (const problem of problems) console.log(`FAIL: ${problem}`);
console.log(problems.length
  ? `FACTS: ${problems.length} problem(s)`
  : `FACTS: ${items.length} stories, ${CLAIMS.length} named claims, every figure and outlet present in the edition`);
process.exit(problems.length ? 1 : 0);
