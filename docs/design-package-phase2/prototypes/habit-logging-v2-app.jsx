// Habit logging prototype v2 — E1 week rhythm + E2 identity arc + E3 kept-hero moment
// Reads helpers from habit-logging-shared.jsx (window globals)

// ---- v2 helpers -------------------------------------------------------------

function countSkips(h) {
  let n = Object.values(h.logs || {}).filter((s) => s === 'skip').length;
  if (h.todayAnswer === 'skip') n += 1;
  if (h.backfillAnswer === 'skip') n += 1;
  return n;
}

function weekStats(h) {
  let skips = 0, answered = 0, kept = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 5, 29 + i); // week of Mon Jun 29
    if (d > TODAY) break;
    let s;
    if (d.toDateString() === TODAY.toDateString()) s = h.todayAnswer;
    else if (d.toDateString() === new Date(2026, 6, 2).toDateString() && h.backfillAnswer && h.backfillAnswer !== 'done') s = h.backfillAnswer;
    else s = (h.logs || {})[d.toDateString()] || null;
    if (s === 'skip') { skips += 1; answered += 1; kept += h.skipValue; }
    else if (s === 'slip') answered += 1;
  }
  return { skips, answered, kept };
}

function chapterName(total) {
  if (total >= 66) return 'Rewired';
  if (total >= 50) return 'Rewiring';
  if (total >= 30) return 'Cruising';
  if (total >= 10) return 'Finding your rhythm';
  return 'Deciding';
}

function identityLine(total) {
  if (total >= 66) return "Rewired. This habit doesn't run you anymore.";
  if (total >= 50) return "You're almost rewired.";
  if (total >= 30) return "You're cruising. The habit is losing its grip.";
  if (total >= 10) return "You're finding your rhythm.";
  return "You're deciding where your money goes.";
}

function WeekStrip({ habit }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const names = { skip: 'skipped', slip: 'slipped', nolog: 'no log', today: 'today, not answered yet', future: 'not yet' };
  const cells = labels.map((lb, i) => {
    const d = new Date(2026, 5, 29 + i);
    let s;
    if (d > TODAY) s = 'future';
    else if (d.toDateString() === TODAY.toDateString()) s = habit.todayAnswer || 'today';
    else if (d.toDateString() === new Date(2026, 6, 2).toDateString() && habit.backfillAnswer && habit.backfillAnswer !== 'done') s = habit.backfillAnswer;
    else if (d < habit.trackingStart) s = 'future';
    else s = (habit.logs || {})[d.toDateString()] || 'nolog';
    return { lb, s };
  });
  const wk = weekStats(habit);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {cells.map((c, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span role="img" aria-label={`${c.lb}, ${names[c.s]}`} style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, boxSizing: 'border-box',
              ...(c.s === 'skip' ? { background: T.primary, color: '#fff' }
                : c.s === 'slip' ? { background: '#ECEFF1', color: '#78909C' }
                : c.s === 'today' ? { border: `1.5px solid ${T.primary}`, color: T.primary }
                : { border: `1.5px dashed ${T.border}`, color: 'transparent' }),
            }}>{c.s === 'skip' ? '\u2713' : '\u00b7'}</span>
            <span aria-hidden="true" style={{ fontSize: 9, fontWeight: 700, color: T.tert }}>{c.lb}</span>
          </div>
        ))}
      </div>
      {wk.answered > 0 && (
        <p style={{ fontSize: 12, color: T.sub, margin: '8px 0 0' }}>
          <b style={{ color: T.text }}>{wk.skips} of {wk.answered} days</b> skipped this week{wk.kept > 0 ? ` \u00b7 ${fmt(wk.kept)} kept` : ''}
        </p>
      )}
    </div>
  );
}

function IdentityArc({ totalSkips }) {
  const pct = Math.min(100, (totalSkips / 66) * 100);
  const chapters = [['Deciding', 0, 10], ['Rhythm', 10, 30], ['Cruising', 30, 50], ['Rewired', 50, 66]];
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.border}` }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 12px' }}>The long arc</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div aria-label={`${totalSkips} of 66 skips`} style={{
          width: 84, height: 84, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `conic-gradient(${T.primary} 0 ${pct}%, ${T.border} ${pct}% 100%)`,
        }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <b style={{ fontSize: 18, color: T.text }}>{totalSkips}</b>
            <span style={{ fontSize: 9, color: T.tert, fontWeight: 700, letterSpacing: 0.5 }}>OF 66</span>
          </div>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, lineHeight: 1.4 }}>{identityLine(totalSkips)}</p>
          <p style={{ fontSize: 12, color: T.sub, margin: '3px 0 0', lineHeight: 1.4 }}>{totalSkips} skips toward the ~66 it takes to rewire a habit. Slips never subtract.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
        {chapters.map(([name, lo, hi]) => {
          const fill = totalSkips >= hi ? 100 : totalSkips <= lo ? 0 : Math.round(((totalSkips - lo) / (hi - lo)) * 100);
          return <span key={name} style={{ flex: 1, height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${T.primary} ${fill}%, ${T.border} ${fill}%)` }}></span>;
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        {chapters.map(([name]) => <span key={name} style={{ fontSize: 10.5, color: T.tert, fontWeight: 600 }}>{name}</span>)}
      </div>
    </div>
  );
}

function KeptHero({ cents }) {
  const [pulse, setPulse] = React.useState(false);
  const prev = React.useRef(cents);
  React.useEffect(() => {
    if (prev.current !== cents) {
      const up = cents > prev.current;
      prev.current = cents;
      if (up) {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 420);
        return () => clearTimeout(t);
      }
    }
  }, [cents]);
  return (
    <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: T.sub, margin: 0 }}>KEPT SO FAR</p>
      <p style={{
        fontSize: 42, fontWeight: 800, margin: '4px 0 2px', letterSpacing: -1,
        color: pulse ? T.primary : T.text, transform: pulse ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 200ms ease-out, color 200ms ease-out',
      }}>
        <CountUpAmount cents={cents} />
      </p>
      <p style={{ fontSize: 14, color: T.sub, margin: 0 }}>money you didn't spend</p>
    </div>
  );
}

// ---- check-in card (the answer card, identical on tab and detail) ----------

function CheckInCard({ habit, onSkip, onSlip, onChange, onBackfill, onPartial, onOpenDetail, milestoneHit, compactLink }) {
  const answered = habit.cadence === 'daily' ? habit.todayAnswer : habit.lastAnswer;
  const isDaily = habit.cadence === 'daily';
  const wk = isDaily ? weekStats(habit) : null;

  const coach = (() => {
    if (!answered) return null;
    if (milestoneHit) return { text: 'A new chapter. Progress here only accumulates, slips never subtract.', tint: true, head: `${milestoneHit} total skips \u00b7 ${chapterName(milestoneHit)}` };
    if (answered === 'skip') return { text: habit.firstRun ? COACH.firstSkip : COACH.skip };
    return { text: COACH.slip };
  })();

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button onClick={onOpenDetail} aria-label={`${habit.name}, open details`} style={{
          background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: onOpenDetail ? 'pointer' : 'default',
          fontSize: 17, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {habit.name}
          {onOpenDetail && <span aria-hidden="true" style={{ color: T.tert, fontSize: 14 }}>›</span>}
        </button>
        {!isDaily && habit.skipsThisPeriod > 0 && <StreakChip>{habit.skipsThisPeriod} skip{habit.skipsThisPeriod !== 1 ? 's' : ''} this week</StreakChip>}
      </div>

      {isDaily && <WeekStrip habit={habit} />}

      {!answered && (
        <div>
          <p style={{ fontSize: 15, color: T.text, margin: '12px 0 4px' }}>
            {isDaily ? 'Did you skip it today?' : `Each skip keeps ${fmt(habit.skipValue)}.`}
          </p>
          {habit.firstRun && <p style={{ fontSize: 13, color: T.sub, margin: '0 0 4px' }}>Your first skip starts the counter.</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn kind="primary" onClick={onSkip}>{isDaily ? `Skipped it +${fmt(habit.skipValue)}` : 'I skipped one'}</Btn>
            <Btn kind="secondary" onClick={onSlip}>I bought it</Btn>
          </div>
        </div>
      )}

      {answered && (
        <div style={{ marginTop: 10 }}>
          {answered === 'skip' ? (
            <p style={{ fontSize: 15, color: T.text, margin: 0, fontWeight: 500 }}>
              +{fmt(habit.skipValue)} kept.{' '}
              {habit.firstRun ? 'Your counter is running.' : isDaily ? `That's ${wk.skips} of ${wk.answered} days this week.` : `${habit.skipsThisPeriod} skips this week.`}
            </p>
          ) : habit.partialAmount != null ? (
            <p style={{ fontSize: 15, color: T.text, margin: 0 }}>
              Logged. You spent {fmt(habit.partialAmount)} instead of {fmt(habit.skipValue)}, so {fmt(Math.max(0, habit.skipValue - habit.partialAmount))} counts as kept.
            </p>
          ) : (
            <p style={{ fontSize: 15, color: T.text, margin: 0 }}>
              Logged.{isDaily ? ` Still ${wk.skips} of ${wk.answered} days this week.` : ''} Your {fmt(habit.kept)} kept stays yours.
            </p>
          )}
          {coach && coach.head && <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '10px 0 0' }}>{coach.head}</p>}
          {coach && <CoachMoment text={coach.text} tint={coach.tint} />}
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn kind="plain" style={{ flex: 'none', padding: 0 }} onClick={onChange}>Change answer</Btn>
            {answered === 'slip' && habit.partialAmount == null && isDaily && (
              <Btn kind="plain" style={{ flex: 'none', padding: 0 }} onClick={onPartial}>Spent less than usual?</Btn>
            )}
          </div>
          {isDaily && habit.backfillAnswer === null && habit.logs[new Date(2026, 6, 2).toDateString()] === 'nolog' && (
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 10 }}>
              <p style={{ fontSize: 13, color: T.sub, margin: '0 0 8px' }}>Missed yesterday? Answer for it:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="secondary" style={{ minHeight: 38, fontSize: 13 }} onClick={() => onBackfill('skip')}>Skipped it</Btn>
                <Btn kind="secondary" style={{ minHeight: 38, fontSize: 13 }} onClick={() => onBackfill('slip')}>Bought it</Btn>
              </div>
            </div>
          )}
          {isDaily && habit.backfillAnswer && (
            <p style={{ fontSize: 13, color: T.sub, margin: '10px 0 0' }}>
              Yesterday: {habit.backfillAnswer === 'skip' ? `skipped, +${fmt(habit.skipValue)} kept.` : 'bought it. Recorded.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- leak card (Leaks found) ------------------------------------------------

function LeakCard({ leak, onBreak, onDismiss }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{leak.name}</span>
        <StreakChip>daily</StreakChip>
      </div>
      <p style={{ fontSize: 14, color: T.sub, margin: '6px 0 12px' }}>
        about {fmt(leak.monthTotal)} a month, {leak.occurrences} times in the last 30 days
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="primary" onClick={onBreak}>Break it</Btn>
        <Btn kind="secondary" onClick={onDismiss}>Not this one</Btn>
      </div>
    </div>
  );
}

// ---- pick-one sheet ----------------------------------------------------------

function PickOneSheet({ leak, onStart, onCancel }) {
  const [value, setValue] = React.useState((leak.avg / 100).toFixed(2));
  return (
    <div role="dialog" aria-label={`Start breaking ${leak.name}`} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
      alignItems: 'flex-end', zIndex: 30,
    }}>
      <div style={{ background: T.card, borderRadius: '20px 20px 0 0', padding: '12px 20px 28px', width: '100%' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: T.border, margin: '0 auto 14px' }}></div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>{leak.name}</h2>
        <p style={{ fontSize: 13, color: T.sub, margin: '2px 0 12px' }}>A daily leak</p>
        <p style={{ fontSize: 15, color: T.text, margin: '0 0 8px', lineHeight: 1.45 }}>
          {leak.name} costs you about {fmt(leak.monthTotal)} a month. You bought it {leak.occurrences} times in the last 30 days.
        </p>
        <p style={{ fontSize: 15, color: T.text, margin: '0 0 16px', lineHeight: 1.45 }}>
          Each time you skip it, we count the money as kept.
        </p>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 6 }}>One skip keeps</label>
        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: 17, color: T.sub, marginRight: 4 }}>$</span>
          <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} aria-label="One skip keeps, amount"
            style={{ border: 'none', outline: 'none', fontSize: 17, fontWeight: 600, color: T.text, width: '100%', fontFamily: 'inherit' }} />
        </div>
        <p style={{ fontSize: 13, color: T.sub, margin: '0 0 16px' }}>We'll ask each day: did you skip it?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn kind="primary" onClick={() => onStart(Math.round(parseFloat(value || '0') * 100))}>Start breaking it</Btn>
          <Btn kind="secondary" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ---- partial slip sheet -------------------------------------------------------

function PartialSheet({ habit, onSave, onCancel }) {
  const [value, setValue] = React.useState('');
  return (
    <div role="dialog" aria-label="How much did it cost?" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', zIndex: 30,
    }}>
      <div style={{ background: T.card, borderRadius: '20px 20px 0 0', padding: '12px 20px 28px', width: '100%' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: T.border, margin: '0 auto 14px' }}></div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>How much did it cost?</h2>
        <p style={{ fontSize: 14, color: T.sub, margin: '0 0 14px', lineHeight: 1.45 }}>
          You usually spend about {fmt(habit.skipValue)}. Anything under that counts as kept.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
          <span style={{ fontSize: 17, color: T.sub, marginRight: 4 }}>$</span>
          <input value={value} inputMode="decimal" placeholder="0.00" onChange={(e) => setValue(e.target.value)} aria-label="Amount spent"
            style={{ border: 'none', outline: 'none', fontSize: 17, fontWeight: 600, color: T.text, width: '100%', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn kind="primary" onClick={() => onSave(Math.round(parseFloat(value || '0') * 100))}>Save</Btn>
          <Btn kind="secondary" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ---- calendar -----------------------------------------------------------------

function HistoryCalendar({ habit }) {
  const [month, setMonth] = React.useState(6); // 2026: 5 = June, 6 = July
  const year = 2026;
  const monthName = ['January','February','March','April','May','June','July'][month];
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const trackMonth = habit.trackingStart.getMonth();
  const canPrev = month > trackMonth;
  const canNext = month < 6;

  const stateFor = (d) => {
    if (!d) return 'pad';
    if (d > TODAY) return 'out';
    if (d < habit.trackingStart) return 'out';
    if (d.toDateString() === TODAY.toDateString()) {
      if (!habit.todayAnswer) return 'nolog';
      return habit.todayAnswer;
    }
    if (d.toDateString() === new Date(2026, 6, 2).toDateString() && habit.backfillAnswer && habit.backfillAnswer !== 'done') return habit.backfillAnswer;
    return habit.logs[d.toDateString()] || 'nolog';
  };

  const dot = (s, label) => {
    const styles = {
      skip: { background: T.primary, border: 'none' },
      slip: { background: T.slip, border: 'none' },
      nolog: { background: 'transparent', border: `1.5px solid ${T.border}` },
    };
    if (s === 'out' || s === 'pad') return <span style={{ width: 26, height: 26 }}></span>;
    return <span role="img" aria-label={label} style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...styles[s] }}>
      {s === 'skip' && <span aria-hidden="true" style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
    </span>;
  };

  const stateName = { skip: 'skipped', slip: 'slipped', nolog: 'no log' };

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{monthName} 2026</p>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => canPrev && setMonth(month - 1)} aria-label="Previous month" disabled={!canPrev} style={{ background: 'none', border: 'none', fontSize: 18, cursor: canPrev ? 'pointer' : 'default', color: canPrev ? T.primary : T.border, padding: '0 8px', fontFamily: 'inherit' }}>‹</button>
          <button onClick={() => canNext && setMonth(month + 1)} aria-label="Next month" disabled={!canNext} style={{ background: 'none', border: 'none', fontSize: 18, cursor: canNext ? 'pointer' : 'default', color: canNext ? T.primary : T.border, padding: '0 8px', fontFamily: 'inherit' }}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, justifyItems: 'center' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => <span key={i} style={{ fontSize: 11, color: T.tert, fontWeight: 600 }}>{d}</span>)}
        {cells.map((d, i) => {
          const s = stateFor(d);
          return <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {dot(s, d ? `${monthName} ${d.getDate()}, ${stateName[s] || 'not tracked'}` : '')}
          </span>;
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        {[['skip', 'Skipped'], ['slip', 'Slipped'], ['nolog', 'No log']].map(([s, label]) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.sub }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%',
              background: s === 'skip' ? T.primary : s === 'slip' ? T.slip : 'transparent',
              border: s === 'nolog' ? `1.5px solid ${T.border}` : 'none' }}></span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventHistory({ habit }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: '6px 16px', border: `1px solid ${T.border}` }}>
      {habit.events.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < habit.events.length - 1 ? `1px solid ${T.border}` : 'none' }}>
          <span style={{ fontSize: 14, color: T.sub }}>{e.date}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
            {e.kind === 'skip' ? `Skipped one · +${fmt(e.amount)}` : 'Bought it'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- screens --------------------------------------------------------------------

function SectionLabel({ children }) {
  return <p style={{ fontSize: 13, fontWeight: 700, color: T.sub, letterSpacing: 0.4, textTransform: 'uppercase', margin: '20px 4px 8px' }}>{children}</p>;
}

function HabitsTab({ state, actions }) {
  return (
    <div data-screen-label="Habits tab" style={{ padding: '8px 16px 90px' }}>
      <KeptHero cents={state.kept} />

      <SectionLabel>Breaking now</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.habits.map((h) => (
          <CheckInCard key={h.id} habit={h} milestoneHit={state.milestoneHit === h.id ? state.milestoneN : null}
            onSkip={() => actions.answer(h.id, 'skip')} onSlip={() => actions.answer(h.id, 'slip')}
            onChange={() => actions.changeAnswer(h.id)} onBackfill={(a) => actions.backfill(h.id, a)}
            onPartial={() => actions.openPartial(h.id)} onOpenDetail={() => actions.openDetail(h.id)} />
        ))}
      </div>

      {state.detected.length > 0 && (
        <div>
          <SectionLabel>Leaks found</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.detected.map((l) => (
              <LeakCard key={l.id} leak={l} onBreak={() => actions.openPickOne(l.id)} onDismiss={() => actions.dismissLeak(l.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailScreen({ habit, state, actions }) {
  const isDaily = habit.cadence === 'daily';
  const wk = isDaily ? weekStats(habit) : null;
  const totalSkips = isDaily ? countSkips(habit) : habit.events.filter((e) => e.kind === 'skip').length;
  return (
    <div data-screen-label="Habit detail" style={{ padding: '0 16px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
        <button onClick={actions.back} aria-label="Back to Habits" style={{ background: 'none', border: 'none', color: T.primary, fontSize: 16, fontWeight: 600, cursor: 'pointer', padding: '6px 8px 6px 0', fontFamily: 'inherit' }}>‹ Habits</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CheckInCard habit={habit} milestoneHit={state.milestoneHit === habit.id ? state.milestoneN : null}
          onSkip={() => actions.answer(habit.id, 'skip')} onSlip={() => actions.answer(habit.id, 'slip')}
          onChange={() => actions.changeAnswer(habit.id)} onBackfill={(a) => actions.backfill(habit.id, a)}
          onPartial={() => actions.openPartial(habit.id)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Kept', fmt(habit.kept)], ['This week', isDaily ? `${wk.skips} of ${wk.answered || 0}` : `${habit.skipsThisPeriod} skips`], ['Total skips', String(totalSkips)]].map(([label, v]) => (
            <div key={label} style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>{v}</p>
              <p style={{ fontSize: 11, color: T.sub, margin: '2px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>

        <IdentityArc totalSkips={totalSkips} />

        {isDaily ? <HistoryCalendar habit={habit} /> : <EventHistory habit={habit} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn kind="secondary" onClick={() => {}}>Edit one skip keeps ({fmt(habit.skipValue)})</Btn>
          <Btn kind="plain" onClick={() => {}}>Stop breaking this habit</Btn>
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const tabs = [['💳', 'Expenses'], ['📊', 'Reports'], ['🗂', 'Categories'], ['🌱', 'Habits'], ['⚙️', 'Settings']];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.96)',
      borderTop: `1px solid ${T.border}`, display: 'flex', padding: '8px 0 22px', zIndex: 10,
    }}>
      {tabs.map(([icon, label]) => (
        <div key={label} style={{ flex: 1, textAlign: 'center', opacity: label === 'Habits' ? 1 : 0.45 }}>
          <div aria-hidden="true" style={{ fontSize: 18, filter: label === 'Habits' ? 'none' : 'grayscale(1)' }}>{icon}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: label === 'Habits' ? T.primary : T.tert }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ---- app ------------------------------------------------------------------------

function App() {
  const [state, setState] = React.useState(() => JSON.parse(JSON.stringify(initialState), (k, v) =>
    (k === 'trackingStart') ? new Date(v) : v));
  const [screen, setScreen] = React.useState('tab');
  const [sheet, setSheet] = React.useState(null); // {kind:'pickone'|'partial', id}

  const update = (fn) => setState((s) => { const c = JSON.parse(JSON.stringify(s), (k, v) => k === 'trackingStart' ? new Date(v) : v); fn(c); return c; });

  const actions = {
    answer(id, kind) {
      update((s) => {
        const h = s.habits.find((x) => x.id === id);
        if (h.cadence === 'daily') {
          h.todayAnswer = kind;
          if (kind === 'skip') { h.streak += 1; h.longest = Math.max(h.longest, h.streak); h.kept += h.skipValue; s.kept += h.skipValue; }
          else { h.prevStreak = h.streak; h.streak = 0; }
        } else {
          h.lastAnswer = kind;
          if (kind === 'skip') { h.skipsThisPeriod += 1; h.streak += 1; h.longest = Math.max(h.longest, h.streak); h.kept += h.skipValue; s.kept += h.skipValue; h.events.unshift({ date: 'Jul 3', kind: 'skip', amount: h.skipValue }); }
          else { h.prevStreak = h.streak; h.streak = 0; h.events.unshift({ date: 'Jul 3', kind: 'slip' }); }
        }
        if (kind === 'skip') {
          const total = h.cadence === 'daily' ? countSkips(h) : h.events.filter((e) => e.kind === 'skip').length;
          if ([10, 30, 50, 66].includes(total)) { s.milestoneHit = id; s.milestoneN = total; }
          else { s.milestoneHit = null; s.milestoneN = null; }
        }
        else { s.milestoneHit = null; s.milestoneN = null; }
      });
    },
    changeAnswer(id) {
      update((s) => {
        const h = s.habits.find((x) => x.id === id);
        if (h.cadence === 'daily') {
          if (h.todayAnswer === 'skip') { h.streak -= 1; h.kept -= h.skipValue; s.kept -= h.skipValue; }
          if (h.todayAnswer === 'slip') { h.streak = h.prevStreak || 0; }
          h.todayAnswer = null; h.partialAmount = null;
        } else {
          if (h.lastAnswer === 'skip') { h.skipsThisPeriod -= 1; h.streak -= 1; h.kept -= h.skipValue; s.kept -= h.skipValue; h.events.shift(); }
          else if (h.lastAnswer === 'slip') { h.streak = h.prevStreak || 0; h.events.shift(); }
          h.lastAnswer = null;
        }
        s.milestoneHit = null; s.milestoneN = null;
      });
    },
    backfill(id, kind) {
      update((s) => {
        const h = s.habits.find((x) => x.id === id);
        h.backfillAnswer = kind;
        if (kind === 'skip') { h.kept += h.skipValue; s.kept += h.skipValue; }
      });
    },
    openPartial(id) { setSheet({ kind: 'partial', id }); },
    savePartial(id, amount) {
      update((s) => {
        const h = s.habits.find((x) => x.id === id);
        h.partialAmount = amount;
        const credit = Math.max(0, h.skipValue - amount);
        h.kept += credit; s.kept += credit;
      });
      setSheet(null);
    },
    openPickOne(id) { setSheet({ kind: 'pickone', id }); },
    startBreaking(id, value) {
      update((s) => {
        const l = s.detected.find((x) => x.id === id);
        s.detected = s.detected.filter((x) => x.id !== id);
        s.habits.push({
          id: l.id, name: l.name, cadence: 'daily', skipValue: value || l.avg,
          kept: 0, streak: 0, longest: 0, todayAnswer: null, firstRun: true,
          trackingStart: new Date(2026, 6, 3), logs: {}, backfillAnswer: 'done', partialAmount: null,
        });
      });
      setSheet(null);
    },
    dismissLeak(id) { update((s) => { s.detected = s.detected.filter((x) => x.id !== id); }); },
    openDetail(id) { setScreen('detail:' + id); },
    back() { setScreen('tab'); },
    reset() { setState(JSON.parse(JSON.stringify(initialState), (k, v) => k === 'trackingStart' ? new Date(v) : v)); setScreen('tab'); setSheet(null); },
  };

  const detailHabit = screen.startsWith('detail:') ? state.habits.find((h) => h.id === screen.split(':')[1]) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <IOSDevice>
        <div style={{ position: 'relative', height: '100%', background: T.bg, overflow: 'hidden', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" }}>
          <div style={{ height: '100%', overflowY: 'auto', paddingTop: 58, boxSizing: 'border-box' }}>
            {detailHabit
              ? <DetailScreen habit={detailHabit} state={state} actions={actions} />
              : <HabitsTab state={state} actions={actions} />}
          </div>
          <TabBar />
          {sheet && sheet.kind === 'pickone' && (
            <PickOneSheet leak={initialState.detected.find((l) => l.id === sheet.id) || state.detected.find((l) => l.id === sheet.id)}
              onStart={(v) => actions.startBreaking(sheet.id, v)} onCancel={() => setSheet(null)} />
          )}
          {sheet && sheet.kind === 'partial' && (
            <PartialSheet habit={state.habits.find((h) => h.id === sheet.id)}
              onSave={(v) => actions.savePartial(sheet.id, v)} onCancel={() => setSheet(null)} />
          )}
        </div>
      </IOSDevice>
      <button onClick={actions.reset} style={{
        background: 'none', border: '1px solid #d4d4d4', borderRadius: 8, padding: '6px 14px',
        fontSize: 12, color: '#737373', cursor: 'pointer', fontFamily: 'inherit',
      }}>Reset prototype</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
