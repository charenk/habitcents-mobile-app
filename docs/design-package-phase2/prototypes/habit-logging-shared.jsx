// Habit logging prototype — shared helpers and data
// Decision 1 spec: design-package-phase2/01-habit-logging-spec.md

const T = {
  primary: '#4CAF50',
  primaryMuted: '#B2DFB6',
  bg: '#F8F8F8',
  card: '#FFFFFF',
  text: '#212121',
  sub: '#757575',
  tert: '#9E9E9E',
  border: '#E5E7EB',
  slip: '#757575',
};

// Amounts are cents; in the app every render goes through useCurrency().format.
const fmt = (cents) => {
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  return (neg ? '-$' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---- seed data -------------------------------------------------------------
// Today in the prototype is Fri Jul 3 2026.
const TODAY = new Date(2026, 6, 3);

function seedCoffeeLogs() {
  // tracking started Jun 17; states for Jun 17 .. Jul 2 (yesterday Jul 2 = no log)
  const pattern = ['skip','skip','slip','skip','nolog','skip','skip','skip','slip','skip','skip','skip','skip','skip','skip','nolog'];
  const logs = {};
  const start = new Date(2026, 5, 17);
  pattern.forEach((s, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    logs[d.toDateString()] = s;
  });
  return logs;
}

const initialState = {
  kept: 12750,
  habits: [
    {
      id: 'coffee', name: 'Coffee run', cadence: 'daily', skipValue: 600,
      kept: 4250, streak: 6, longest: 6, todayAnswer: null, firstRun: false,
      trackingStart: new Date(2026, 5, 17), logs: seedCoffeeLogs(),
      backfillOffered: false, backfillAnswer: null, partialAmount: null,
    },
    {
      id: 'delivery', name: 'Food delivery', cadence: 'weekly', skipValue: 1800,
      kept: 3600, streak: 2, longest: 4, skipsThisPeriod: 1, firstRun: false,
      events: [
        { date: 'Jun 30', kind: 'skip', amount: 1800 },
        { date: 'Jun 27', kind: 'skip', amount: 1800 },
        { date: 'Jun 24', kind: 'slip' },
      ],
      lastAnswer: null,
    },
  ],
  detected: [
    { id: 'lunch', name: 'Lunch out', cadence: 'daily', monthTotal: 9600, avg: 1200, occurrences: 8 },
  ],
};

const MILESTONES = [1, 3, 7, 14, 30, 66];
const milestoneName = (n) => n === 1 ? 'First skip' : n === 66 ? '66: habit rewired' : `${n} in a row`;

const COACH = {
  firstSkip: 'Your counter is running. Every skip is money you decided to keep.',
  skip: 'The urge passes in minutes. The money you kept stays all day.',
  slip: 'Missing once is an accident. Missing twice starts a new habit.',
  milestone7: "You're becoming someone who decides where money goes.",
  milestone3: 'Three in a row. This is what breaking a habit looks like.',
};

// ---- small shared components ----------------------------------------------

function CountUpAmount({ cents, big }) {
  const [display, setDisplay] = React.useState(cents);
  const prev = React.useRef(cents);
  React.useEffect(() => {
    const from = prev.current, to = cents;
    prev.current = cents;
    if (from === to) return;
    const t0 = performance.now(), dur = 250;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(display)}</span>;
}

function Btn({ kind, children, onClick, style }) {
  const base = {
    flex: 1, minHeight: 46, borderRadius: 12, fontSize: 15, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer', padding: '0 12px',
  };
  const kinds = {
    primary: { background: T.primary, color: '#fff', border: 'none' },
    secondary: { background: '#fff', color: T.text, border: `1px solid ${T.border}` },
    plain: { background: 'none', color: T.sub, border: 'none', fontWeight: 500, minHeight: 32 },
  };
  return <button onClick={onClick} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

function CoachMoment({ text, tint }) {
  return (
    <div style={{
      background: tint ? 'rgba(178,223,182,0.3)' : T.bg, borderRadius: 12,
      padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10,
    }}>
      <span aria-hidden="true" style={{ fontSize: 13, lineHeight: '19px' }}>🌱</span>
      <span style={{ fontSize: 14, color: T.text, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

function StreakChip({ children }) {
  return (
    <span style={{
      background: T.bg, borderRadius: 999, padding: '4px 10px',
      fontSize: 12, fontWeight: 600, color: T.sub, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

Object.assign(window, { T, fmt, TODAY, initialState, MILESTONES, milestoneName, COACH, CountUpAmount, Btn, CoachMoment, StreakChip });
