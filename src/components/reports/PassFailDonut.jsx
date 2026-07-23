const SIZE = 110;
const RADIUS = 42;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Pass/Fail/Skipped donut for one run - each arc's length is proportional to its share of the total. */
export default function PassFailDonut({ passed, failed, skipped = 0 }) {
  const total = passed + failed + skipped;

  if (total === 0) {
    return <div className="empty-state" style={{ padding: 20 }}>No results yet</div>;
  }

  const segments = [
    { label: 'Passed', value: passed, color: 'var(--accent)' },
    { label: 'Failed', value: failed, color: 'var(--red)' },
    { label: 'Skipped', value: skipped, color: 'var(--text-dim)' }
  ].filter((s) => s.value > 0);

  let offsetAccum = 0;
  const passRate = Math.round((passed / total) * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border-2)" strokeWidth={STROKE} />
          {segments.map((seg) => {
            const len = (seg.value / total) * CIRCUMFERENCE;
            const el = (
              <circle
                key={seg.label}
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
                stroke={seg.color} strokeWidth={STROKE}
                strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                strokeDashoffset={-offsetAccum}
                strokeLinecap="round"
              />
            );
            offsetAccum += len;
            return el;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--accent)' }}>{passRate}%</div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>pass rate</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Passed', value: passed, color: 'var(--accent)' },
          { label: 'Failed', value: failed, color: 'var(--red)' },
          { label: 'Skipped', value: skipped, color: 'var(--text-dim)' }
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  );
}
