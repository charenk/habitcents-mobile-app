#!/usr/bin/env node
/**
 * Emits the habit-card-states canvas artboards (.dc.html) from shared
 * templates so every state stays pixel-consistent with the app tokens
 * (constants/theme.ts, CheckInCard.tsx, WeekStrip.tsx as of main bdff4c8).
 * Edit here, run `node build.mjs`, then re-seed the canvas.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = dirname(fileURLToPath(import.meta.url));

/* App tokens (exact values) */
const T = {
  sage: '#2C7851',
  sageLight: '#E8F5EE',
  ink: '#1A1D23',
  slate: '#4A5568',
  mistText: '#677481',
  cloud: '#E8EDF2',
  snow: '#F7F9FC',
  white: '#FFFFFF',
  hairlineSubtle: '#F1F4F8',
  lavender14: 'rgba(142,124,243,0.14)',
};

const CSS = `
  body{margin:0;background:${T.snow};font-family:Inter,system-ui,sans-serif;color:${T.ink};-webkit-font-smoothing:antialiased}
  .wrap{padding:20px}
  .card{background:${T.white};border:1px solid ${T.cloud};border-radius:20px;padding:18px;box-shadow:0 4px 8px rgba(26,29,35,0.04)}
  .hdr{display:flex;align-items:center;gap:8px}
  .name{font-weight:600;font-size:16px;line-height:20px;color:${T.ink}}
  .sp{flex:1}
  .pill{background:${T.lavender14};border-radius:999px;padding:4px 8px;font-weight:600;font-size:11px;color:${T.ink}}
  .chip{background:${T.snow};border-radius:999px;padding:4px 10px;font-weight:600;font-size:12.5px;color:${T.slate}}
  .strip{display:flex;justify-content:space-between;margin-top:14px}
  .day{display:flex;flex-direction:column;align-items:center;gap:6px}
  .dot{width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:${T.white};box-sizing:border-box}
  .dot.skip{background:${T.sage}}
  .dot.slip{background:${T.cloud}}
  .dot.today{border:1.5px solid ${T.sage}}
  .dot.open{border:1.5px solid ${T.cloud}}
  .dl{font-size:9px;font-weight:700;color:${T.mistText}}
  .sum{margin-top:10px;font-size:12.5px;color:${T.slate};font-variant-numeric:tabular-nums}
  .sum b{font-weight:600;color:${T.ink}}
  .q{margin-top:14px;font-size:15px;line-height:20px;color:${T.ink}}
  .first{margin-top:4px;font-size:13px;line-height:18px;color:${T.slate}}
  .btns{display:flex;gap:8px;margin-top:12px}
  .btn{display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:10px;font-weight:600;font-size:16px;padding:0 20px;text-align:center}
  .btn.pri{flex:1.6;background:${T.sage};color:${T.white}}
  .btn.sec{flex:1;background:${T.white};border:1px solid ${T.cloud};color:${T.ink}}
  .btn.sm{min-height:44px;font-size:14px;flex:1}
  .ans{margin-top:14px}
  .crow{display:flex;align-items:center;gap:12px}
  .badge{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:none}
  .badge.skip{background:${T.sage}}
  .badge.slip{background:${T.cloud}}
  .ctxt{flex:1;min-width:0}
  .chead{font-weight:600;font-size:15px;line-height:20px;color:${T.ink};font-variant-numeric:tabular-nums}
  .cdet{font-size:13px;line-height:18px;color:${T.slate};margin-top:2px;font-variant-numeric:tabular-nums}
  .links{display:flex;gap:18px;margin-top:14px}
  .link{font-weight:600;font-size:14px;color:${T.slate}}
  .coach{margin-top:12px;border-radius:14px;padding:12px;display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:19px;color:${T.slate}}
  .coach.sage{background:${T.sageLight}}
  .coach.ms{background:${T.lavender14}}
  .coach .h{font-weight:600;color:${T.ink};margin-bottom:2px}
  .bf{border-top:1px solid ${T.hairlineSubtle};margin-top:14px;padding-top:12px}
  .bfp{font-size:13px;color:${T.slate}}
  .bfdone{font-size:13px;color:${T.slate};margin-top:12px;font-variant-numeric:tabular-nums}
  .eyebrow{font-size:11px;letter-spacing:0.88px;font-weight:600;color:${T.mistText};text-transform:uppercase}
  .lrow{display:flex;align-items:center;gap:12px;padding:12px 0}
  .lrow+.lrow{border-top:1px solid ${T.hairlineSubtle}}
  .tile{width:36px;height:36px;border-radius:10px;background:${T.hairlineSubtle};display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}
  .lcol{flex:1;min-width:0}
  .lname{font-weight:600;font-size:14px;color:${T.ink}}
  .lsub{font-size:12.5px;color:${T.slate};margin-top:2px;font-variant-numeric:tabular-nums}
  .lstrip{display:flex;gap:5px;margin-top:6px}
  .ldot{width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
  .ldot.spent{background:${T.cloud}}
  .ldot.none{border:1.5px solid ${T.cloud}}
  .evid{font-size:13px;line-height:19px;color:${T.slate};margin-top:8px;font-variant-numeric:tabular-nums}
  .lbtns{display:flex;gap:8px;margin-top:12px}
`;

/* Lucide-style inline icons */
const icons = {
  check: (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  minus: (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${T.mistText}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  dollar: (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
  sprout: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${T.sage}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px"><path d="M7 20h10"></path><path d="M10 20c5.5-2.5.8-6.4 3-10"></path><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path></svg>`,
};

/* Week strip. states: k=skipped, s=slipped, t=today ring, ts=today slipped, tk=today skipped, o=open */
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function strip(states, glyph = 'dollar') {
  const dot = (st) => {
    if (st === 'k' || st === 'tk') {
      const g = glyph === 'dollar' ? icons.dollar(13, T.white) : icons.check(14, T.white);
      return `<div class="dot skip">${g}</div>`;
    }
    if (st === 's' || st === 'ts') return `<div class="dot slip"></div>`;
    if (st === 't') return `<div class="dot today"></div>`;
    return `<div class="dot open"></div>`;
  };
  return `<div class="strip">${states
    .map((st, i) => `<div class="day">${dot(st)}<div class="dl">${DAYS[i]}</div></div>`)
    .join('')}</div>`;
}

const hdr = (name, pill) =>
  `<div class="hdr"><div class="name">${name}</div>${pill ? `<div class="pill">${pill}</div>` : ''}<div class="sp"></div>${icons.chevron}</div>`;

const card = (inner) => `<div class="wrap"><div class="card">${inner}</div></div>`;

const page = (body, extraCss = '') => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <style>${CSS}${extraCss}</style>
</helmet>
${body}
</x-dc>
</body>
</html>
`;

const files = {};

/* ---- Before: the current card, answered-skip state, everything stacked ---- */
files['Before.dc.html'] = page(
  card(
    hdr('Tims Spending') +
      strip(['k', 'o', 's', 'tk', 'o', 'o', 'o'], 'check') +
      `<div class="sum"><b>2 of 3 days</b> skipped this week &middot; $110.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge skip">${icons.check(20, T.white)}</div><div class="ctxt"><div class="chead">+$55.00 kept.</div><div class="cdet">That's 2 of 3 days this week.</div></div></div>` +
      `<div class="links"><div class="link">Change answer</div><div class="link">Spent less than usual?</div></div>` +
      `<div class="bf"><div class="bfdone">Yesterday: skipped, +$55.00 kept.</div></div></div>`
  )
);

/* ---- Main: Ask (the redesigned default) ---- */
files['Main.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'k', 't', 'o', 'o', 'o']) +
      `<div class="sum"><b>2 skips</b> this week &middot; $110.00 kept</div>` +
      `<div class="q">Did you skip it today?</div>` +
      `<div class="btns"><div class="btn pri">Skipped &middot; +$55.00</div><div class="btn sec">Bought it</div></div>`
  )
);

/* ---- Ask, first run ---- */
files['AskFirstRun.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['o', 'o', 'o', 't', 'o', 'o', 'o']) +
      `<div class="q">Did you skip it today?</div>` +
      `<div class="first">Your first skip starts the counter.</div>` +
      `<div class="btns"><div class="btn pri">Skipped &middot; +$55.00</div><div class="btn sec">Bought it</div></div>`
  )
);

/* ---- Kept: answered skip, one line + one link ---- */
files['Kept.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'k', 'tk', 'o', 'o', 'o']) +
      `<div class="sum"><b>3 skips</b> this week &middot; $165.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge skip">${icons.check(20, T.white)}</div><div class="ctxt"><div class="chead">+$55.00 kept.</div></div></div>` +
      `<div class="links"><div class="link">Change answer</div></div></div>`
  )
);

/* ---- Kept + milestone coach moment ---- */
files['KeptCoach.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'k', 'tk', 'o', 'o', 'o']) +
      `<div class="sum"><b>3 skips</b> this week &middot; $165.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge skip">${icons.check(20, T.white)}</div><div class="ctxt"><div class="chead">+$55.00 kept.</div></div></div>` +
      `<div class="coach ms">${icons.sprout}<div><div class="h">10 total skips &middot; Rhythm</div>Skipping is easier the second time, and easier again the third. You're wearing a new path.</div></div>` +
      `<div class="links"><div class="link">Change answer</div></div></div>`
  )
);

/* ---- Logged: answered slip ---- */
files['Logged.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'k', 'ts', 'o', 'o', 'o']) +
      `<div class="sum"><b>2 skips</b> this week &middot; $110.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge slip">${icons.minus(20, T.mistText)}</div><div class="ctxt"><div class="chead">Logged. Your kept stays yours.</div></div></div>` +
      `<div class="links"><div class="link">Spent less than usual?</div></div></div>`
  )
);

/* ---- Partial: slip with a lower amount saved ---- */
files['Partial.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'k', 'ts', 'o', 'o', 'o']) +
      `<div class="sum"><b>2 skips</b> this week &middot; $163.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge slip">${icons.minus(20, T.mistText)}</div><div class="ctxt"><div class="chead">Logged. $53.00 counts as kept.</div></div></div></div>`
  )
);

/* ---- Backfill: once-ever prompt inside an answered card ---- */
files['Backfill.dc.html'] = page(
  card(
    hdr('Tims') +
      strip(['k', 'o', 'o', 'tk', 'o', 'o', 'o']) +
      `<div class="sum"><b>2 skips</b> this week &middot; $110.00 kept</div>` +
      `<div class="ans"><div class="crow"><div class="badge skip">${icons.check(20, T.white)}</div><div class="ctxt"><div class="chead">+$55.00 kept.</div></div></div>` +
      `<div class="links"><div class="link">Change answer</div></div>` +
      `<div class="bf"><div class="bfp">Missed yesterday? Answer for it:</div>` +
      `<div class="btns"><div class="btn sec sm">Skipped it</div><div class="btn sec sm">Bought it</div></div></div></div>`
  )
);

/* ---- Weekly cadence card ---- */
files['Weekly.dc.html'] = page(
  card(
    hdr('Food delivery', 'weekly') +
      `<div style="margin-top:12px"><span class="chip">2 skips this week &middot; $36.00 kept</span></div>` +
      `<div class="q">No daily check-in. Tap whenever you skip an order.</div>` +
      `<div class="btns"><div class="btn pri" style="flex:1">Skipped one &middot; +$18.00</div></div>`
  )
);

/* ---- Flow: the whole loop in four nodes ---- */
const flowNode = (title, lines, tone) => `
  <div style="background:${T.white};border:1px solid ${T.cloud};border-radius:14px;padding:14px 16px;width:190px;box-sizing:border-box">
    <div style="font-weight:600;font-size:14px;color:${tone || T.ink}">${title}</div>
    <div style="font-size:12.5px;line-height:17px;color:${T.slate};margin-top:4px">${lines}</div>
  </div>`;
const arrow = (label) => `
  <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:none">
    <div style="font-size:11px;font-weight:600;color:${T.mistText};white-space:nowrap">${label}</div>
    <svg width="52" height="12" viewBox="0 0 52 12" fill="none" stroke="${T.mistText}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="6" x2="44" y2="6"></line><polyline points="40 2 46 6 40 10"></polyline></svg>
  </div>`;
files['Flow.dc.html'] = page(
  `<div class="wrap">
    <div class="eyebrow">The whole loop</div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap">
      ${flowNode('Ask', 'Did you skip it today?<br>Skipped &middot; +$55.00 / Bought it')}
      ${arrow('Skipped')}
      ${flowNode('Kept', '+$55.00 kept. Summary line carries the week count.<br>Change answer', T.sage)}
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:20px;flex-wrap:wrap">
      ${flowNode('Ask', 'Same card, other answer')}
      ${arrow('Bought it')}
      ${flowNode('Logged', 'Logged. Your kept stays yours.<br>Spent less than usual?')}
      ${arrow('Spent less')}
      ${flowNode('Partial', 'Logged. $53.00 counts as kept.')}
    </div>
    <div style="font-size:12.5px;color:${T.slate};margin-top:20px;max-width:640px;line-height:18px">
      Change answer returns the card to Ask. The once-ever Missed yesterday prompt rides inside an answered card and disappears for good after one use. Everything else (history, totals, chapter arc, edit skip value, stop) lives on the habit detail screen.
    </div>
  </div>`
);

/* ---- Dot language: locked 2026-09-10 ---- */
const legendLeakStrip = `<div class="lstrip" style="justify-content:space-between;margin-top:0">${[1, 0, 1, 1, 0, 0, 1]
  .map((d) =>
    d
      ? `<div class="ldot spent" style="width:26px;height:26px;border-radius:13px">${icons.dollar(13, T.mistText)}</div>`
      : `<div class="ldot none" style="width:26px;height:26px;border-radius:13px"></div>`
  )
  .join('')}</div>`;
files['DotVariants.dc.html'] = page(
  `<div class="wrap">
    <div class="eyebrow">One dot language (locked 2026-09-10)</div>
    <div style="display:flex;gap:60px;margin-top:16px;flex-wrap:wrap">
      <div style="width:353px">
        <div style="font-weight:600;font-size:14px">Habit card &middot; green $ = money kept</div>
        <div class="card" style="margin-top:10px">${strip(['k', 'o', 'k', 'tk', 'o', 'o', 'o'])}</div>
        <div style="font-size:12.5px;color:${T.slate};margin-top:10px;line-height:18px">A skipped day fills sage with a white $. A bought day is flat cloud. Green marks the win, never the spend.</div>
      </div>
      <div style="width:353px">
        <div style="font-weight:600;font-size:14px">Leak row &middot; neutral $ = money left</div>
        <div class="card" style="margin-top:10px;padding-top:24px;padding-bottom:24px">${legendLeakStrip}</div>
        <div style="font-size:12.5px;color:${T.slate};margin-top:10px;line-height:18px">A day you spent at the merchant fills cloud with a mist $. Evidence stays neutral: spending never earns green.</div>
      </div>
    </div>
  </div>`
);

/* ---- Leak funnel page ---- */
/* Leak evidence strip: last 7 days, filled neutral $ = a day with a log at this merchant */
function leakStrip(days) {
  return `<div class="lstrip">${days
    .map((d) => (d ? `<div class="ldot spent">${icons.dollar(11, T.mistText)}</div>` : `<div class="ldot none"></div>`))
    .join('')}</div>`;
}
const leakRow = (emoji, name, days, sub) =>
  `<div class="lrow"><div class="tile">${emoji}</div><div class="lcol"><div class="lname">${name}</div>${leakStrip(days)}<div class="lsub">${sub}</div></div></div>`;

files['LeakQuiet.dc.html'] = page(
  `<div class="wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:360px;text-align:center">
    <div style="width:96px;height:96px;border-radius:48px;background:${T.sageLight};display:flex;align-items:center;justify-content:center">${icons.sprout.replace('width="14" height="14"', 'width="40" height="40"')}</div>
    <div style="font-weight:600;font-size:15px;margin-top:16px;max-width:240px;line-height:21px">Every skip lands here as money kept</div>
    <div style="font-weight:600;font-size:14px;color:${T.sage};margin-top:12px;text-decoration:underline">Learn how skips and habits work</div>
  </div>`
);

files['LeakCandidates.dc.html'] = page(
  `<div class="wrap">
    <div class="eyebrow">Leaks</div>
    <div class="card" style="margin-top:10px;padding-top:6px;padding-bottom:6px">
      ${leakRow('&#9749;', 'Tims', [1, 0, 0, 1, 0, 0, 0], '$13.00 so far &middot; 2 buys')}
      ${leakRow('&#128722;', 'Walmart', [0, 1, 0, 0, 1, 0, 0], '$57.00 so far &middot; 2 buys')}
    </div>
  </div>`
);

files['LeakDetected.dc.html'] = page(
  `<div class="wrap">
    <div class="eyebrow">Leaks</div>
    <div class="card" style="margin-top:10px">
      <div class="lrow" style="padding-top:0;padding-bottom:0"><div class="tile">&#9749;</div><div class="lcol"><div class="lname" style="font-size:16px">Tims</div>${leakStrip([1, 1, 0, 1, 1, 0, 0])}</div></div>
      <div class="evid">$112.00 at Tims across 7 buys.<br><span style="color:${T.mistText};font-size:12.5px">Keep logging to see the monthly pattern.</span></div>
      <div class="lbtns"><div class="btn pri" style="flex:1">Break it</div><div class="btn sec">Not this one</div></div>
      <div class="coach" style="background:${T.snow}">${icons.sprout}<div>Here's your leak. You don't have to quit it, just decide, one day at a time, whether it's worth it.</div></div>
    </div>
  </div>`
);

files['LeakPane.dc.html'] = page(
  `<div class="wrap">
    <div class="eyebrow">Leaks</div>
    <div class="card" style="margin-top:10px">
      <div class="lrow" style="padding-top:0;padding-bottom:0"><div class="tile">&#9749;</div><div class="lcol"><div class="lname" style="font-size:16px">Tims</div>${leakStrip([1, 1, 0, 1, 1, 0, 0])}</div></div>
      <div class="evid">$112.00 at Tims across 7 buys.</div>
      <div class="lbtns"><div class="btn pri" style="flex:1">Break it</div><div class="btn sec">Not this one</div></div>
    </div>
    <div class="card" style="margin-top:12px;padding-top:6px;padding-bottom:6px">
      ${leakRow('&#128722;', 'Walmart', [0, 1, 0, 0, 1, 0, 0], '$57.00 so far &middot; 2 buys')}
    </div>
    <div class="eyebrow" style="margin-top:24px;display:block">Breaking now</div>
    <div class="card" style="margin-top:10px">
      ${hdr('Coffee')}
      ${strip(['k', 'o', 'k', 't', 'o', 'o', 'o'])}
      <div class="sum"><b>2 skips</b> this week &middot; $110.00 kept</div>
      <div class="q">Did you skip it today?</div>
      <div class="btns"><div class="btn pri">Skipped &middot; +$55.00</div><div class="btn sec">Bought it</div></div>
    </div>
    <div style="margin-top:24px;border:1.5px dashed ${T.cloud};border-radius:14px;min-height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 16px">
      <div style="font-weight:600;font-size:14px;color:${T.sage}">Break another habit</div>
      <div style="width:28px;height:28px;border-radius:14px;background:${T.white};border:1px solid ${T.cloud};display:flex;align-items:center;justify-content:center;color:${T.sage};font-weight:600">+</div>
    </div>
  </div>`
);

for (const [name, html] of Object.entries(files)) {
  writeFileSync(join(out, name), html);
  console.log('wrote', name);
}
