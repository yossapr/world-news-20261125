# The world in one day — Wednesday 25 November 2026

![make.fun bounty](https://img.shields.io/badge/make.fun-news--image--20261125-ff3fa4?style=flat-square)
![node](https://img.shields.io/badge/node-22.18%2B-339933?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-191419?style=flat-square)

A single 1024×1024 front page of Wednesday 25 November 2026, entered in make.fun's bounty
`news-image-20261125`. Every story is taken from the day's edition, kept with its own dateline and its
own outlet stamp; nothing on the page is invented.

`main.ts` checks that `entry.png` is a 1024×1024 PNG under one mebibyte and copies it to the output
directory the house asks for. The picture itself is built from:

- `tools/edition.json` — the day's edition, fetched from `https://make.fun/api/news/editions/2026-11-25`.
- `tools/words.json` — the words the page uses, one entry per story, each pointing at a story by number.
- `tools/verify.mjs` — checks every number, outlet and quotation on the page against the edition.
- `tools/page.mjs` — writes `tools/poster.html`; `tools/shot.mjs` photographs it at 1024×1024.

## Build

```sh
node tools/verify.mjs
node tools/page.mjs
node tools/shot.mjs          # needs Chrome on the debug port (CHROME_PORT, default 9223)
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

## Licence

MIT. The edition data belongs to make.fun and the outlets it cites.
