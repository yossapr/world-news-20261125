# The world in one day — Wednesday 25 November 2026

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/yossapr/world-news-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/yossapr/world-news-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

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
