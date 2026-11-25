import { createHash } from "node:crypto";
import { statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Photograph the finished front page with the Chrome already listening on the
// debug port. The camera is pinned to 1024x1024: the same frame the page is
// laid out for, and the frame the grader wants back.
const PORT = Number(process.env.CHROME_PORT || 9223);
const SIDE = 1024;
const LIMIT = 1024 * 1024;
const sheet = resolve("tools/poster.html");
const photo = resolve("entry.png");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function openTab() {
  const address = "http://127.0.0.1:" + PORT + "/json/new?" + encodeURIComponent(pathToFileURL(sheet).href);
  const answer = await fetch(address, { method: "PUT" });
  if (!answer.ok) throw new Error("Chrome would not open a tab: " + answer.status);
  return answer.json();
}

function session(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let counter = 0;
  const ready = new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", () => fail(new Error("no socket to Chrome")), { once: true });
  });
  socket.addEventListener("message", (event) => {
    const reply = JSON.parse(event.data);
    const waiter = pending.get(reply.id);
    if (!waiter) return;
    pending.delete(reply.id);
    if (reply.error) waiter.fail(new Error(reply.error.message));
    else waiter.done(reply.result);
  });
  const ask = (method, params = {}) => new Promise((done, fail) => {
    counter += 1;
    pending.set(counter, { done, fail });
    socket.send(JSON.stringify({ id: counter, method, params }));
  });
  return { ready, ask, close: () => socket.close() };
}

const tab = await openTab();
const page = session(tab.webSocketDebuggerUrl);
await page.ready;
await page.ask("Page.enable");
await page.ask("Runtime.enable");
await page.ask("Emulation.setDeviceMetricsOverride", {
  width: SIDE, height: SIDE, deviceScaleFactor: 1, mobile: false,
});
await page.ask("Page.navigate", { url: pathToFileURL(sheet).href });

for (let tries = 0; tries < 120; tries += 1) {
  const state = await page.ask("Runtime.evaluate", {
    expression: "document.readyState + \"/\" + document.fonts.status",
    returnByValue: true,
  });
  if (state.result.value === "complete/loaded") break;
  await sleep(100);
}
await sleep(350);

const probe = await page.ask("Runtime.evaluate", {
  expression: [
    "(() => {",
    "  const sheet = document.documentElement;",
    "  const spills = [];",
    "  for (const node of document.querySelectorAll(\"body *\")) {",
    "    const box = node.getBoundingClientRect();",
    "    if (box.width === 0 || box.height === 0) continue;",
    "    if (box.right > 1024.5 || box.bottom > 1024.5) spills.push(node.className || node.tagName);",
    "  }",
    "  const clipped = [];",
    "  for (const node of document.querySelectorAll(\"body *\")) {",
    "    const style = getComputedStyle(node);",
    "    if (style.overflowY !== \"hidden\" && style.overflow !== \"hidden\") continue;",
    "    if (node.scrollHeight > node.clientHeight + 8) clipped.push(node.className || node.tagName);",
    "  }",
    "  return { scrollWidth: sheet.scrollWidth, scrollHeight: sheet.scrollHeight, spills, clipped };",
    "})()",
  ].join("\n"),
  returnByValue: true,
});
const report = probe.result.value;
if (report.scrollWidth > SIDE || report.scrollHeight > SIDE) {
  throw new Error("the page is bigger than its frame: " + report.scrollWidth + "x" + report.scrollHeight);
}
if (report.spills.length > 0) {
  throw new Error("these run past the frame: " + report.spills.slice(0, 6).join(", "));
}
for (const name of report.clipped) {
  console.warn("clipped text: " + name);
}

const shoot = async () => {
  const frame = await page.ask("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: SIDE, height: SIDE, scale: 1 },
  });
  return Buffer.from(frame.data, "base64");
};

// Chrome paints the same frame twice in a row or not at all: take photographs
// until two of them agree, and keep the one that did.
// The first frames after a fresh paint can settle differently from the rest, so let
// the page stand for half a second before the first photograph is taken.
await sleep(500);
let picture = await shoot();
for (let look = 0; look < 6; look += 1) {
  await sleep(250);
  const again = await shoot();
  if (again.equals(picture)) break;
  console.warn("frame moved between shots, retaking (" + look + ")");
  picture = again;
}
page.close();
await fetch("http://127.0.0.1:" + PORT + "/json/close/" + tab.id).catch(() => {});

if (picture.length > LIMIT) throw new Error("the photograph is " + picture.length + " bytes, over one mebibyte");
writeFileSync(photo, picture);
const digest = createHash("sha256").update(picture).digest("hex").toUpperCase();
console.log("shot: " + SIDE + "x" + SIDE + ", " + statSync(photo).size + " bytes, sha256 " + digest);