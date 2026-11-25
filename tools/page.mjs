// page.mjs — writes tools/poster.html, the 1024×1024 front page for Tuesday 24 November 2026.
// Inputs: edition.json (the day's 28 stories), words.json (every word printed) and land-path.txt
// (Natural Earth coastlines). Nothing is fetched. Usage: node tools/page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const local = (name) => fileURLToPath(new URL(name, import.meta.url));
const edition = JSON.parse(readFileSync(local('./edition.json'), 'utf8'));
const copy = JSON.parse(readFileSync(local('./words.json'), 'utf8'));
const coast = readFileSync(local('./land-path.txt'), 'utf8').trim();

const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const storyAt = (n) => edition.stories.find((story) => story.n === n);
const regionStyle = (id) => copy.regions[id] ?? copy.regions.world;
const tally = edition.stories.reduce((acc, story) => ({ ...acc, [story.region]: (acc[story.region] ?? 0) + 1 }), {});

// The page must carry the edition exactly: 3 leads, 10 cards, 18 briefs, no story twice.
const placed = [...copy.leads, ...copy.cards, ...copy.briefs].map((item) => item.n);
if (placed.length !== 28 || new Set(placed).size !== 28) throw new Error(`expected 28 distinct stories, got ${placed.length}`);
if (placed.some((n) => storyAt(n) === undefined)) throw new Error('copy names a story the edition does not hold');
if (copy.leads.map((lead) => lead.n).join() !== '1,2,3') throw new Error('the leads must be the edition leads');

// How the day was filed: thirteen outlet stamps, all inside 23 November 2026 UTC, checked against
// the edition's own publishedAt values so no time on the page is invented.
const CLOCK = [
  { n: 2, at: '00:24', about: 'Taiex opens' }, { n: 23, at: '01:16', about: 'AFCON ruling' },
  { n: 4, at: '01:24', about: 'alert on Ulleung' }, { n: 2, at: '02:45', about: 'Nikkei up 4%' },
  { n: 17, at: '03:10', about: 'Francis diary' }, { n: 10, at: '03:21', about: 'Nepal quake' },
  { n: 6, at: '03:36', about: 'tech fines 5%' }, { n: 7, at: '04:14', about: 'Meta bomb' },
  { n: 13, at: '04:43', about: 'Commanders win' }, { n: 1, at: '06:33', about: 'three tankers' },
  { n: 5, at: '07:12', about: 'Shenzhou-24' }, { n: 18, at: '11:18', about: 'seven terms' },
  { n: 23, at: '15:37', about: 'CAS appeal' },
];
for (const tick of CLOCK) {
  const stamps = (storyAt(tick.n).links ?? []).map((link) => link.publishedAt ?? '');
  const sameDay = stamps.some((stamp) => stamp.startsWith('2026-11-24') && stamp.slice(11, 16) === tick.at);
  if (!sameDay) throw new Error(`clock ${tick.at} is not story ${tick.n}'s own stamp: ${stamps.join(' ')}`);
}

const regionKey = Object.entries(tally).sort((a, b) => b[1] - a[1])
  .map(([id, count]) => `<span class="rg"><i style="background:${regionStyle(id)[1]}"></i>${regionStyle(id)[0]}<b>${count}</b></span>`).join('');

// Map: equirectangular, 64N..50S, one dot per dateline in its region's hue, the leads numbered.
const FRAME = { top: 20, height: 114 };
const plot = (lon, lat) => [lon + 180, 84 - Math.min(64, Math.max(-50, lat))];
const dotFor = (story, radius) => {
  const [x, y] = plot(story.geo.lon, story.geo.lat);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${regionStyle(story.region)[2]}" opacity="${radius > 2.5 ? 1 : 0.92}"/>`;
};
const quietDots = edition.stories.filter((story) => story.geo && story.tier !== 'lead').map((story) => dotFor(story, 2.2)).join('');
const loudDots = [1, 2, 3].map((n) => {
  const story = storyAt(n);
  const [x, y] = plot(story.geo.lon, story.geo.lat);
  const place = copy.labels[n];
  const anchor = place.anchor ? ` text-anchor="${place.anchor}"` : '';
  return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#0f2433"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.4" fill="${regionStyle(story.region)[2]}"/>` +
    `<text x="${x.toFixed(1)}" y="${(y + 2.1).toFixed(1)}" class="mn">${n}</text>` +
    `<text x="${(x + place.dx).toFixed(1)}" y="${(y + place.dy).toFixed(1)}" class="ml"${anchor}>${place.label}</text></g>`;
}).join('');
const worldMap = `<svg class="map" viewBox="0 ${FRAME.top} 360 ${FRAME.height}" preserveAspectRatio="xMidYMid meet" aria-label="World map with one dot for each story">
<rect x="0" y="${FRAME.top}" width="360" height="${FRAME.height}" fill="#0f2433"/>
<g stroke="#1b3749" stroke-width="0.35" fill="none"><path d="M0 24H360M0 54H360M0 84H360M0 114H360"/><path d="M60 0V142M120 0V142M180 0V142M240 0V142M300 0V142"/></g>
<path d="${coast}" fill="#2b4c63" stroke="#456b83" stroke-width="0.55"/>
${quietDots}
${loudDots}
</svg>`;

// Lead drawings: flat vector shapes, each tied to what its story reports.
const star = (cx, cy, radius) => {
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const reach = i % 2 ? radius * 0.34 : radius;
    return `${(cx + reach * Math.cos(angle)).toFixed(1)} ${(cy + reach * Math.sin(angle)).toFixed(1)}`;
  });
  return `M${points.join('L')}Z`;
};

const DRAWING = {
  // a draft on the table, its warming line crossing the 1.5C limit
  deal: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#123029"/>
<rect x="54" y="26" width="96" height="94" fill="#cbc2ae"/>
<g transform="rotate(-4 102 74)">
<rect x="46" y="20" width="100" height="96" fill="#f6f1e4"/>
<g stroke="#a89d88" stroke-width="2.4" stroke-linecap="round"><path d="M56 30H94"/><path d="M56 37H104"/><path d="M56 44H84"/></g>
<path d="M56 106V62C62 82 70 90 78 88s10-14 18-18 12-2 18-6" fill="none" stroke="#b3261e" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M52 78H142" stroke="#b3261e" stroke-width="1.3" stroke-dasharray="4 3" opacity=".9"/>
<circle cx="134" cy="64" r="3.2" fill="#b3261e"/>
<g stroke="#d8d0bd" stroke-width="1"><path d="M56 100H96"/><path d="M56 105H84"/></g>
</g>
<path d="M14 120H152" stroke="#2c4a41" stroke-width="1.2"/>
</svg>`,
  // three bridges over the Dnipro, the middle span broken by the overnight strike
  bridge: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#13253c"/>
<g stroke="#e0662f" stroke-width="1.6" stroke-linecap="round" opacity=".95"><path d="M148 4L126 34"/><path d="M162 10L140 38"/><path d="M132 2L116 26"/><path d="M164 26L150 48"/></g>
<g fill="#f0b24a"><circle cx="126" cy="34" r="2.6"/><circle cx="140" cy="38" r="2.6"/><circle cx="116" cy="26" r="2.2"/><circle cx="150" cy="48" r="2.6"/></g>
<path d="M2 86C2 62 56 62 56 86" fill="none" stroke="#eef3fa" stroke-width="2.8"/>
<path d="M112 86C112 62 162 62 162 86" fill="none" stroke="#eef3fa" stroke-width="2.8"/>
<g stroke="#f2f6fb" stroke-width="3.8" stroke-linecap="round"><path d="M0 86H56"/><path d="M112 86H164"/></g>
<g stroke="#c3d0de" stroke-width="0.9" opacity=".85"><path d="M12 86V71M26 86V67M40 86V71M126 86V71M140 86V67M154 86V71"/></g>
<g stroke="#a9bccf" stroke-width="3"><path d="M56 86V110"/><path d="M112 86V110"/></g>
<g stroke="#f2f6fb" stroke-width="3.8" stroke-linecap="round"><path d="M56 86L66 99"/><path d="M112 86L102 97"/></g>
<rect x="66" y="103" width="32" height="6.4" rx="1" transform="rotate(26 82 106)" fill="#cfd9e5"/>
<rect x="60" y="115" width="10" height="3.6" transform="rotate(-16 65 116)" fill="#b9c6d6"/>
<g fill="#9fb3c8" opacity=".45"><circle cx="72" cy="112" r="3"/><circle cx="98" cy="110" r="2.4"/></g>
<path d="M2 110H150" stroke="#3d5871" stroke-width="1.2"/>
<g stroke="#6f88a6" stroke-width="1.1" opacity=".75"><path d="M8 116H44M58 122H94M108 116H146M26 126H62M88 128H120"/></g>
<path d="${star(84, 96, 8)}" fill="#ffd9a0" stroke="#e0662f" stroke-width="0.9" opacity=".95"/>
</svg>`,
  // two US bases in Bahrain under radomes, both waves of drones intercepted above them
  bases: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#2a1512"/>
<path d="M0 104H164" stroke="#7a4a3a" stroke-width="1.1"/>
<path d="M18 104a26 26 0 0 1 52 0z" fill="#d5c8b3"/>
<g stroke="#a8957e" stroke-width="0.8" opacity=".8"><path d="M28 104c0-14 6-23 16-26M44 78c9 3 16 12 16 26M44 78v26"/></g>
<rect x="22" y="104" width="44" height="9" fill="#c2b49f"/>
<rect x="38" y="106" width="12" height="6" fill="#7d6d59"/>
<path d="M96 104a33 33 0 0 1 64 0z" fill="#e7ddd0"/>
<g stroke="#ac9880" stroke-width="0.8" opacity=".85"><path d="M104 104c0-18 9-30 28-33M124 71c12 4 22 16 22 33M128 104V71"/></g>
<rect x="102" y="104" width="52" height="10" fill="#d8cbb8"/>
<rect x="122" y="107" width="14" height="7" fill="#8d7c67"/>
<path d="M128 71V56" stroke="#e7ddd0" stroke-width="2.4"/><path d="M120 53a8 8 0 0 1 16 0z" fill="#e7ddd0"/>
<g stroke="#ef8a3f" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M4 20L32 44"/><path d="M104 4L120 30"/><path d="M146 8L136 32"/></g>
<g fill="#f0b24a"><path d="M32 44l12 2-7 8z"/><path d="M120 30l12 3-7 7z"/><path d="M136 32l11 3-6 7z"/></g>
<path d="${star(44, 58, 9)}" fill="#fff3c4" stroke="#e0662f" stroke-width="1"/>
<path d="${star(128, 40, 11)}" fill="#fff3c4" stroke="#e0662f" stroke-width="1"/>
</svg>`,
  // three tankers burning off Hormuz, and the mines that did it bobbing in the swell
  mines: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#0b2231"/>
<path d="M0 74h164v58H0z" fill="#123d4e"/>
<g stroke="#2c6a7d" stroke-width="1" opacity=".7"><path d="M0 86c14 4 26-4 40 0s26 4 40 0 26 4 40 0 30 4 44 0"/><path d="M0 104c16 4 28-4 44 0s28 4 44 0 28 4 44 0 24 4 32 0"/></g>
<g><rect x="12" y="80" width="40" height="12" fill="#c8d7dd"/><rect x="16" y="72" width="10" height="8" fill="#9fb3bc"/><rect x="30" y="66" width="4" height="14" fill="#8aa0aa"/></g>
<g><rect x="62" y="82" width="44" height="13" fill="#dbe7ec"/><rect x="68" y="72" width="12" height="10" fill="#a9bcc5"/><rect x="86" y="64" width="4" height="18" fill="#93a9b3"/></g>
<g><rect x="116" y="78" width="38" height="12" fill="#c1d2d9"/><rect x="122" y="70" width="9" height="8" fill="#9cb0ba"/></g>
<g fill="#f2a33c"><path d="M26 66c5-9 12-9 8 2 5-7 10-4 5 6-6 9-15 6-13-8z"/><path d="M80 62c7-12 16-11 10 3 7-8 12-3 6 8-7 12-19 7-16-11z"/><path d="M130 70c4-8 10-8 7 2 4-6 9-3 4 5-5 8-13 5-11-7z"/></g>
<g fill="#8b8f93" opacity=".55"><circle cx="30" cy="52" r="10"/><circle cx="42" cy="42" r="8"/><circle cx="86" cy="46" r="13"/><circle cx="100" cy="34" r="9"/><circle cx="134" cy="56" r="8"/></g>
<g fill="#1c1c1c" stroke="#000" stroke-width=".5"><circle cx="22" cy="96" r="4.4"/><circle cx="70" cy="100" r="4.4"/><circle cx="120" cy="97" r="4.4"/></g>
<g stroke="#1c1c1c" stroke-width="1.6" stroke-linecap="round"><path d="M22 91.6V88M22 100.4V104M17.6 96H14M26.4 96H30"/><path d="M70 95.6V92M70 104.4V108M65.6 100H62M74.4 100H78"/><path d="M120 92.6V89M120 101.4V105M115.6 97H112M124.4 97H128"/></g>
<g fill="#e2543a"><path d="M46 92l10 4-10 4z"/><path d="M108 94l10 4-10 4z"/></g>
</svg>`,
  // a chart climbing off a rout, with the close printed in the corner
  markets: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#0e2340"/>
<g stroke="#26456b" stroke-width=".8" opacity=".9"><path d="M8 30h148M8 56h148M8 82h148M8 108h148"/></g>
<path d="M10 112L34 104 52 108 70 88 88 92 104 66 122 58 140 30 152 22" fill="none" stroke="#f2a33c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M10 112L34 104 52 108 70 88 88 92 104 66 122 58 140 30 152 22V124H10z" fill="#f2a33c" opacity=".14"/>
<g fill="#57c28a"><rect x="18" y="96" width="7" height="20"/><rect x="40" y="90" width="7" height="26"/><rect x="62" y="98" width="7" height="18"/><rect x="84" y="82" width="7" height="34"/><rect x="106" y="74" width="7" height="42"/><rect x="128" y="62" width="7" height="54"/></g>
<g fill="#7fd6a6" opacity=".85"><rect x="28" y="88" width="6" height="28"/><rect x="50" y="94" width="6" height="22"/><rect x="72" y="76" width="6" height="40"/><rect x="94" y="70" width="6" height="46"/><rect x="116" y="56" width="6" height="60"/><rect x="138" y="44" width="6" height="72"/></g>
<path d="M132 34l18-14 6 8-18 14z" fill="#f7f3ea"/>
<path d="M136 40l6-2-4-4z" fill="#b3261e"/>
<g font-family="Georgia,serif" font-weight="700" fill="#f7f3ea"><text x="12" y="26" font-size="26">9%</text></g>
<g font-family="Arial" font-size="6.2" fill="#9fb6d2" letter-spacing="1"><text x="12" y="36">TAIEX CLOSE</text></g>
</svg>`,
  // ninety-six drones over a five-storey block, with one floor torn open
  drones: `<svg viewBox="0 0 164 132" aria-hidden="true">
<rect width="164" height="132" fill="#171226"/>
<g fill="#2a2340"><circle cx="30" cy="22" r="1.5"/><circle cx="92" cy="14" r="1.2"/><circle cx="128" cy="30" r="1.4"/><circle cx="58" cy="40" r="1"/><circle cx="146" cy="12" r="1.1"/><circle cx="14" cy="46" r="1"/></g>
<g stroke="#efe4c8" stroke-width="1.5" fill="none" stroke-linecap="round">
<path d="M26 30l16-8M42 22l-2 10M40 32l-16-2M24 30l2-8"/>
<path d="M96 24l18-9M114 15l-2 11M112 26l-18-2M94 24l2-9"/>
<path d="M60 50l14-7M74 43l-2 9M72 52l-14-2M58 50l2-7"/>
<path d="M130 44l15-8M145 36l-2 10M143 46l-15-2M128 44l2-8"/>
</g>
<g fill="#e2543a"><path d="M26 34l4-2 2 4-4 2z"/><path d="M96 28l4-2 2 4-4 2z"/><path d="M60 54l4-2 2 4-4 2z"/><path d="M130 48l4-2 2 4-4 2z"/></g>
<g stroke="#e2543a" stroke-width="1.2" opacity=".8"><path d="M30 38v22"/><path d="M100 32v20"/><path d="M64 58v14"/></g>
<rect x="18" y="62" width="60" height="70" fill="#3a3350"/>
<rect x="84" y="74" width="62" height="58" fill="#332c47"/>
<g fill="#f2d79b"><rect x="24" y="70" width="8" height="7"/><rect x="38" y="70" width="8" height="7"/><rect x="52" y="70" width="8" height="7"/><rect x="66" y="70" width="8" height="7"/><rect x="24" y="88" width="8" height="7"/><rect x="52" y="88" width="8" height="7"/><rect x="38" y="106" width="8" height="7"/><rect x="66" y="106" width="8" height="7"/><rect x="92" y="84" width="8" height="7"/><rect x="108" y="84" width="8" height="7"/><rect x="124" y="84" width="8" height="7"/><rect x="92" y="102" width="8" height="7"/><rect x="124" y="102" width="8" height="7"/></g>
<path d="M18 96h60v10H18z" fill="#0f0c16"/>
<path d="M42 96l10 14-6 22h-16l4-22z" fill="#0f0c16"/>
<g fill="#6b6478" opacity=".5"><circle cx="58" cy="66" r="9"/><circle cx="70" cy="58" r="7"/><circle cx="46" cy="58" r="6"/></g>
<path d="M0 126h164v6H0z" fill="#0b0910"/>
</svg>`,
};

// One 24×24 glyph per card, drawn in the card's region colour.
const ICON = {
  ship: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 15.6h19.6l-2.9 4.6H5.1z" fill="currentColor"/><rect x="6.4" y="10.6" width="3.4" height="3.2" fill="currentColor"/><rect x="10.6" y="10.6" width="3.4" height="3.2" fill="currentColor" opacity=".65"/><rect x="10.6" y="6.6" width="3.4" height="3.2" fill="currentColor"/><circle cx="16.6" cy="7.4" r="2.2" fill="currentColor" opacity=".45"/><circle cx="19" cy="4.6" r="1.7" fill="currentColor" opacity=".3"/><path d="M17.4 10.4V15" stroke="currentColor" stroke-width="1.4"/></svg>`,
  burst: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l2.1 5.3 4.6-3.2-1.9 5.2 5.6.1-4.6 3.1 3.4 4.2-5.4-1.2.6 5.5-3.6-4.2-3.6 4.2.6-5.5-5.4 1.2 3.4-4.2L3.6 9l5.6-.1L7.3 3.7l4.6 3.2z" fill="currentColor"/><circle cx="12" cy="12.4" r="2.6" fill="#f7f3ea"/></svg>`,
  boat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.4 12.4l17-3.6 1.6 5.2-15.4 3.2z" fill="currentColor"/><path d="M8.6 9.4l1.2-3.6 4 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><g stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M2 19.6c1.6-1.4 3-1.4 4.6 0s3 1.4 4.6 0 3-1.4 4.6 0 3 1.4 4.6 0"/><path d="M2 22.4c1.6-1.4 3-1.4 4.6 0s3 1.4 4.6 0 3-1.4 4.6 0 3 1.4 4.6 0" opacity=".55"/></g><circle cx="15.4" cy="7.2" r="1.6" fill="currentColor"/></svg>`,
  talks: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4.2h12.6v8.4H9.4l-3.6 3v-3H2z" fill="currentColor" opacity=".55"/><path d="M9.4 9.6h12.6V18h-3.8v3l-3.6-3H9.4z" fill="currentColor" stroke="#f7f3ea" stroke-width="1.1"/><g stroke="#f7f3ea" stroke-width="1.3" stroke-linecap="round"><path d="M12.4 12.6h6.6M12.4 15.2h4.6"/></g></svg>`,
  aid: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.6" y="7.6" width="18.8" height="13.4" rx="1" fill="currentColor"/><rect x="1.8" y="4.2" width="20.4" height="4" rx="0.8" fill="currentColor" opacity=".65"/><path d="M12 11.2c1.8-2.4 5.4-.8 4.3 2-.7 1.7-4.3 4-4.3 4s-3.6-2.3-4.3-4c-1.1-2.8 2.5-4.4 4.3-2z" fill="#f7f3ea"/></svg>`,
  cuffs: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="7.4" cy="12" r="4.6"/><circle cx="16.6" cy="12" r="4.6"/></g><path d="M11.4 12h1.2" stroke="currentColor" stroke-width="2.2"/><path d="M3.4 8.4 1.6 6.6M20.6 8.4l1.8-1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 1.6L4.2 13.4h6.2l-1.6 9 9.4-12h-6.4z" fill="currentColor"/><path d="M3 21.4h5.6M15.4 21.4H21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>`,
  probe: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.4" cy="10.4" r="7.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.8 15.8L21.6 21.6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M6.4 7.6l3.2 4 2-2.6 2.4 3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.6 12.4h3.6l2-4.2 3 8.4 2.2-4.2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sub: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 15.4c0-2.6 2.6-4 6.6-4h10.4l2.6 2-2.6 2H8.8c-4 0-6.6-1.4-6.6-4z" fill="currentColor"/><rect x="8.4" y="7.6" width="5.2" height="4" rx="1" fill="currentColor"/><path d="M11 7.6V4.4h3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><g stroke="currentColor" stroke-width="1.4" opacity=".6" stroke-linecap="round"><path d="M3 19.4h7M13 19.4h8"/></g></svg>`,
  cup: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 3.4h11.2v5.2a5.6 5.6 0 0 1-11.2 0z" fill="currentColor"/><path d="M17.6 4.8h2.4a2.8 2.8 0 0 1 0 5.6h-2.4M6.4 4.8H4a2.8 2.8 0 0 0 0 5.6h2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.4 14.6h3.2v3.2h-3.2z" fill="currentColor" opacity=".75"/><path d="M7.6 20.6h8.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  bat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 2.6l7.2 7.2-9.4 9.4-2.6-2.6z" fill="currentColor" opacity=".8"/><path d="M9.4 16.6l-3.4 3.4-2.6-2.6 3.4-3.4z" fill="currentColor"/><circle cx="5.6" cy="20.4" r="2.4" fill="currentColor" opacity=".6"/></svg>`,
};

// Each of the 31 items is stamped with its own time where the edition records one (the outlet's
// UTC publishedAt), and with the edition's own date where it does not, so every line carries a when.
if (edition.day !== '2026-11-24') throw new Error(`the edition is dated ${edition.day}`);
const STAMP = new Map(edition.stories.map((story) => {
  const at = (story.links ?? []).map((link) => link.publishedAt ?? '').find((value) => value.startsWith('2026-11-24'));
  return [story.n, at ? at.slice(11, 16) : '24 NOV'];
}));
if (STAMP.size !== 28) throw new Error(`expected 31 stamps, got ${STAMP.size}`);
const stampOf = (n) => STAMP.get(n) ?? '24 NOV';

const clockBlock = `<section class="daystrip"><div class="ds-head"><h5>The filing clock, in UTC <span>thirteen reports stamped hour by hour, the last at 15:37 GMT</span></h5></div>
<div class="ds-track">${CLOCK.map((tick) => `<div class="ds-i"><b>${tick.at}</b><span>${escape(tick.about)}</span></div>`).join('')}</div></section>`;

const leadBlock = (lead) => `<article class="lead"><div class="panel"><div class="panel-txt">
<div class="pk">${escape(`${lead.p} · ${lead.t}`)}</div>
<div class="pfig">${escape(lead.fig)}</div>
<div class="punit">${escape(lead.unit)}</div>
<div class="psub">${escape(lead.sub)}</div>
<div class="pmark"><em>${escape(lead.mark[0])}</em> ${escape(lead.mark[1])}</div>
</div><div class="part">${DRAWING[lead.art]}</div></div>
<h3>${lead.head.map(escape).join('<br>')}</h3><p class="deck">${escape(lead.deck)}</p><div class="src">${escape(lead.src)} &middot; <span class="ts">${stampOf(lead.n)}</span></div></article>`;

const cardBlock = (card) => `<article class="card" style="--gc:${regionStyle(storyAt(card.n).region)[1]}">
<div class="chead"><span class="ck">${escape(`${card.p} · ${card.t}`)}</span><span class="cg">${ICON[card.glyph] ?? ''}</span></div>
<h4>${escape(card.h)}</h4><p><b>${escape(card.d)}</b> &middot; ${escape(card.b)}</p><div class="src">${escape(card.s)} &middot; <span class="ts">${stampOf(card.n)}</span></div></article>`;

const briefItem = (item) => `<li style="--gc:${regionStyle(storyAt(item.n).region)[1]}"><b>${escape(item.p)}</b> ${escape(item.t)} <span class="bs">${escape(item.s)} &middot; <span class="ts">${stampOf(item.n)}</span></span></li>`;

// Briefs run down three columns of near-equal length, so the last row is never ragged whatever
// the edition holds: the longest columns come first and the rest take one fewer.
const perColumn = Math.ceil(copy.briefs.length / 3);
const longerColumns = copy.briefs.length - 3 * (perColumn - 1);
let nextBrief = 0;
const briefColumns = [0, 1, 2].map((column) => {
  const size = perColumn - (column < longerColumns ? 0 : 1);
  const briefs = copy.briefs.slice(nextBrief, nextBrief + size);
  nextBrief += size;
  return `<ul class="b">${briefs.map(briefItem).join('')}</ul>`;
});

const figureBlock = (figure) => `<div class="num"><div class="nf">${escape(figure.fig)}</div><div class="nc">${escape(figure.cap)} <span class="ns">&middot; ${escape(figure.s)}</span></div></div>`;

const stylesheet = `
:root{--paper:#f7f3ea;--ink:#15120e;--muted:#6d645a;--rule:#15120e;--soft:#d8cfc0;--accent:#b3261e;--amber:#f3c79a}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden}
body{background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;padding:11px 16px 9px;display:flex;flex-direction:column;gap:5px}
.rail{display:flex;justify-content:space-between;align-items:baseline;background:var(--ink);color:#e8dfd2;padding:3px 8px 2.5px;font-size:8.8px;letter-spacing:.16em;text-transform:uppercase}
.rail b{color:var(--paper);letter-spacing:.18em}
.rail .date{color:var(--amber);font-weight:700;letter-spacing:.18em}
.mast{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;border-top:3px solid var(--rule);border-bottom:1px solid var(--rule);padding:3px 0 4px}
.mast h1{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:48px;line-height:.94;letter-spacing:-.028em}
.mast .side{text-align:right;font-size:8.6px;line-height:1.35;letter-spacing:.1em;text-transform:uppercase;color:#4a433b;padding-bottom:3px;white-space:nowrap}
.mast .side b{display:block;font-size:10.6px;letter-spacing:.01em;text-transform:none;color:var(--ink);font-family:Georgia,serif;font-style:italic;font-weight:400;margin:1px 0}
.daystrip{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:3px 0 4px}
.daystrip .ds-head{display:flex;align-items:baseline;gap:0}
.daystrip h5{margin:0 0 3px}
.ds-track{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:0;border-top:1px solid #b8ae9e}
.ds-i{position:relative;min-width:0;border-left:1px solid #cec3b0;padding:3px 6px 2px 7px;color:#332d26}
.ds-i:first-child{border-left:0}
.ds-i::before{content:'';position:absolute;left:-1px;top:-1px;width:1px;height:5px;background:var(--accent)}
.ds-i:first-child::before{left:0}
.ds-i b{display:block;font-size:7.4px;font-weight:700;letter-spacing:.01em;color:var(--accent);line-height:1.05}
.ds-i span{display:block;font-size:7.5px;line-height:1.15;margin-top:1.5px;white-space:nowrap;overflow:hidden}
.leads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 14px}
.lead{min-width:0;display:flex;flex-direction:column}
.panel{position:relative;display:flex;height:132px;overflow:hidden;background:#123029}
.lead:nth-child(2) .panel{background:#13253c}
.lead:nth-child(3) .panel{background:#2a1512}
.panel .part{position:absolute;right:0;top:0;width:164px;height:132px}
.panel .part svg{display:block;width:164px;height:132px}
.panel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,48,41,.98) 40%,rgba(18,48,41,0) 74%);z-index:1}
.lead:nth-child(2) .panel::after{background:linear-gradient(90deg,rgba(19,37,60,.98) 40%,rgba(19,37,60,0) 74%)}
.lead:nth-child(3) .panel::after{background:linear-gradient(90deg,rgba(42,21,18,.98) 40%,rgba(42,21,18,0) 74%)}
.panel-txt{position:relative;z-index:2;padding:5px 0 5px 9px;width:52%;color:#f7f3ea;display:flex;flex-direction:column}
.pk{font-size:7.4px;letter-spacing:.12em;text-transform:uppercase;color:var(--amber);font-weight:700;white-space:nowrap}
.pfig{font-family:Georgia,serif;font-size:46px;font-weight:700;line-height:.92;letter-spacing:-.03em;margin-top:auto}
.punit{font-size:8.3px;line-height:1.1;letter-spacing:.03em;text-transform:uppercase;color:#ece3d5;margin-top:2px}
.psub{font-size:7.6px;line-height:1.18;color:#c7d2da;margin-top:2px}
.pmark{font-size:6.6px;line-height:1.2;color:#e8dcc6;letter-spacing:.03em;margin-top:4px;border-top:1px solid rgba(255,255,255,.22);padding-top:2.5px}
.pmark em{font-style:normal;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
.lead h3{font-family:Georgia,serif;font-size:24px;line-height:1.01;letter-spacing:-.018em;margin:5px 0 2px}
.lead .deck{font-size:9.6px;line-height:1.2;color:#332d26}
.src{font-size:7.4px;letter-spacing:.055em;text-transform:uppercase;color:#8a8074;margin-top:2px}
.mid{display:grid;grid-template-columns:1fr 312px;gap:14px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:4px 0 5px}
h5{font-size:8.4px;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:2px}
h5 span{color:var(--muted);letter-spacing:.04em;text-transform:none;font-weight:400;font-size:7.6px}
.map{width:100%;display:block;border:1px solid #0b1c27}
.ml{font:700 5.6px Arial;fill:#f4efe3;letter-spacing:.03em;paint-order:stroke;stroke:#0f2433;stroke-width:1.2}
.mn{font:700 5.1px Arial;fill:#f9f5ea;text-anchor:middle}
.regions{display:flex;flex-wrap:wrap;gap:1px 11px;margin-top:3px;align-items:center}
.rg{font-size:8px;color:#3d372f;display:inline-flex;align-items:center;gap:3px}
.rg i{width:6px;height:6px;display:inline-block}
.rg b{margin-left:1px}
.nums-panel{background:#0f2433;color:var(--paper);padding:4px 9px 8px;display:flex;flex-direction:column}
.nums-panel h5{color:var(--amber);border-bottom:1px solid #4a433b;padding-bottom:2px;margin-bottom:3px}
.nums-panel h5 span{color:#a89c8d}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:2px 9px;flex:1;align-content:space-between}
.nf{font-family:Georgia,serif;font-size:23px;font-weight:700;line-height:.98;letter-spacing:-.03em;color:var(--amber)}
.nc{font-size:7.1px;line-height:1.12;color:#e8dfd2;margin-top:1px;padding-right:2px}
.ns{color:#a89c8d;font-size:6.4px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 12px;align-content:start}
.card{padding:1px 0 1px;border-top:3px solid var(--gc);min-width:0}
.chead{display:flex;justify-content:space-between;align-items:center;gap:4px;min-height:25px}
.ck{flex:1 1 auto;min-width:0;font-size:6.9px;letter-spacing:.07em;text-transform:uppercase;color:var(--accent);font-weight:700;white-space:nowrap;overflow:hidden}
.cg{flex:0 0 24px;width:24px;height:24px;color:var(--gc)}
.cg svg{display:block;width:24px;height:24px}
.card h4{font-family:Georgia,serif;font-size:11.9px;line-height:1.04;letter-spacing:-.01em;margin:1px 0}
.card p{font-size:8.1px;line-height:1.13;color:#4a433b}
.card p b{color:var(--ink)}
.card .src{margin-top:1px}
.sentence{border-top:2px solid var(--rule);border-bottom:1px solid var(--rule);padding:2px 0 2px;display:flex;gap:12px;align-items:baseline}
.sentence .lab{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;white-space:nowrap}
.sentence p{font-family:Georgia,serif;font-size:14.6px;line-height:1.18;letter-spacing:-.01em}
.sentence p b{font-weight:700}
.briefs-head{border-top:1px solid var(--soft);padding-top:3px;display:flex;justify-content:space-between;align-items:baseline}
.briefs-head h5{margin:0}
.briefs-head .cnt{font-size:7.8px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.briefs{flex:1;min-height:0;border-top:1px solid var(--soft);padding:5px 0 3px;margin-top:3px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 16px}
ul.b{list-style:none;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
ul.b li{font-size:10.4px;line-height:1.13;color:#2b2620;padding-left:9px;position:relative}
ul.b li::before{content:'';position:absolute;left:0;top:5px;width:4px;height:4px;background:var(--gc)}
ul.b li b{font-weight:700}
.ts{color:#3f382f;font-weight:700;letter-spacing:.02em}
.bs{color:#8a8074;font-size:7px;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap}
.foot{border-top:1px solid var(--rule);padding-top:3px;display:flex;justify-content:space-between;align-items:baseline;gap:14px}
.foot p{font-size:7.4px;line-height:1.24;color:#4a433b;max-width:830px}
.foot p b{color:var(--ink)}
.mark{font-family:Georgia,serif;font-size:10px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
`;

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Tuesday 24 November 2026</title><style>${stylesheet}</style></head>
<body>
<div class="rail"><span><b>The world in one day</b></span><span class="date">Tuesday 24 November 2026</span><span>28 stories &middot; 7 regions &middot; every one sourced</span></div>
<header class="mast"><h1>Tuesday 24 November 2026</h1><div class="side">A front page of the day&rsquo;s reporting<b>28 stories, from Taipei to Pago Pago</b></div></header>
${clockBlock}
<section class="leads">${copy.leads.map(leadBlock).join('')}</section>
<section class="mid"><div><h5>Where it happened, Tuesday 24 November 2026 <span>one dot for each dateline, coloured by region; the numbered three are the leads</span></h5>${worldMap}<div class="regions">${regionKey}</div></div><div class="nums-panel"><h5>The day in numbers <span>as its outlets reported them</span></h5><div class="nums">${copy.figures.map(figureBlock).join('')}</div></div></section>
<section class="cards">${copy.cards.map(cardBlock).join('')}</section>
<section class="sentence"><span class="lab">The day in one sentence</span><p><b>Iran</b> says its mines set three tankers ablaze in Hormuz, <b>Taipei</b> closes up 9% as Nvidia’s founder comes back, and <b>Russia</b>’s 96 drones tear a Zaporizhzhia block: one Tuesday, 28 stories, seven regions.</p></section>
<section class="briefs-head"><h5>And in brief <span>the rest of the day, place by place</span></h5><span class="cnt">15 more stories</span></section>
<section class="briefs">${briefColumns.join('')}</section>
<footer class="foot"><p><b>Date check.</b> This is the Tuesday 24 November 2026 edition, closed with 28 stories. Each carries the dateline its outlet gave it; the thirteen clock times are those outlets&rsquo; own UTC stamps, all on 24 November, and every other date here belongs to the story that names it. Nothing is invented and no story is repeated. Outlets are named with every story; the map is drawn from Natural Earth land outlines.</p><div class="mark">One day &middot; 28 stories &middot; 7 regions</div></footer>
</body></html>`;

writeFileSync(local('./poster.html'), page);
console.log(`poster.html: ${page.length} bytes, ${copy.leads.length} leads, ${copy.cards.length} cards, ${copy.briefs.length} briefs, ${copy.figures.length} figures`);
