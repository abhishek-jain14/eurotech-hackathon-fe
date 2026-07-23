import { useMemo, useState } from 'react';

const CHART_HEIGHT = 200;
const BAR_WIDTH = 22;
const BAR_GAP = 14;
const AXIS_WIDTH = 34;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 30;
const SEGMENT_GAP = 2; // surface-color gap between stacked segments
const CORNER_RADIUS = 4;

const STATUS_TAG = { COMPLETED: 'tag-g', FAILED: 'tag-r', RUNNING: 'tag-p', QUEUED: 'tag-p' };

function niceStep(roughStep) {
  if (roughStep <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Path for a rect with only its top two corners rounded - the "data end" of a
 * (stacked) bar; the baseline/joint edges stay square per the mark spec. */
function roundedTopRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, height, width / 2));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y + height} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} ` +
         `L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r} ` +
         `L ${x + width} ${y + height} Z`;
}

/**
 * Stacked bar chart of Passed vs Failed counts per execution run, ordered
 * chronologically. Run-level totals only track passed/failed (not skipped -
 * that's only tracked per scenario/test-data row), so those are the two series.
 */
export default function ExecutionHistoryChart({ runs }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const sorted = useMemo(
    () => [...runs].sort((a, b) => new Date(a.startedAt || 0) - new Date(b.startedAt || 0)),
    [runs]
  );

  if (sorted.length === 0) {
    return <div className="empty-state">No execution runs yet for this application.</div>;
  }

  const maxValue = Math.max(1, ...sorted.map((r) => (r.passedCount || 0) + (r.failedCount || 0)));
  const step = niceStep(maxValue / 4);
  const chartMax = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = [];
  for (let t = 0; t <= chartMax; t += step) ticks.push(t);

  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const chartWidth = AXIS_WIDTH + sorted.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP;
  const baselineY = PADDING_TOP + plotHeight;
  const yFor = (value) => baselineY - (value / chartMax) * plotHeight;
  const hovered = sorted.find((r) => r.id === hoveredId);

  return (
    <div>
      <div className="card-hd">
        <span className="card-title">Execution History</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {!showTable && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
            ✓ Passed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
            ✕ Failed
          </span>
        </div>
      )}

      {showTable ? (
        <table>
          <thead>
            <tr><th>Started</th><th>Suite</th><th>Environment</th><th>Status</th><th>Passed</th><th>Failed</th></tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.startedAt)}</td>
                <td>{r.suiteName}</td>
                <td>{r.environmentName}</td>
                <td><span className={`tag ${STATUS_TAG[r.status] || ''}`}>{r.status}</span></td>
                <td style={{ color: 'var(--accent)' }}>{r.passedCount}</td>
                <td style={{ color: 'var(--red)' }}>{r.failedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg width={chartWidth} height={CHART_HEIGHT} style={{ display: 'block', minWidth: '100%' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={AXIS_WIDTH} x2={chartWidth} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth="1" />
                <text x={AXIS_WIDTH - 8} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-dim)">{t}</text>
              </g>
            ))}

            {sorted.map((r, i) => {
              const x = AXIS_WIDTH + BAR_GAP / 2 + i * (BAR_WIDTH + BAR_GAP);
              const passed = r.passedCount || 0;
              const failed = r.failedCount || 0;
              const passedHeight = (passed / chartMax) * plotHeight;
              const failedHeight = (failed / chartMax) * plotHeight;
              const gap = passed > 0 && failed > 0 ? SEGMENT_GAP : 0;
              const passedY = baselineY - passedHeight;
              const failedY = passedY - gap - failedHeight;
              const isHovered = hoveredId === r.id;
              const isDimmed = hoveredId != null && !isHovered;

              return (
                <g
                  key={r.id}
                  onMouseEnter={() => setHoveredId(r.id)}
                  onMouseLeave={() => setHoveredId((id) => (id === r.id ? null : id))}
                  style={{ cursor: 'pointer' }}
                  opacity={isDimmed ? 0.45 : 1}
                >
                  <title>
                    {`${r.suiteName} — ${formatDateTime(r.startedAt)}\n${r.environmentName} · ${r.status}\nPassed: ${passed}  Failed: ${failed}`}
                  </title>
                  {/* Invisible full-height hit target so hovering anywhere in the bar's column works, not just the filled segment. */}
                  <rect x={x - BAR_GAP / 2} y={PADDING_TOP} width={BAR_WIDTH + BAR_GAP} height={plotHeight} fill="transparent" />

                  {passed === 0 && failed === 0 ? (
                    <rect x={x} y={baselineY - 3} width={BAR_WIDTH} height={3} rx="1.5" fill="var(--border-2)" />
                  ) : failed > 0 ? (
                    <>
                      <rect x={x} y={passedY} width={BAR_WIDTH} height={passedHeight} fill="var(--accent)" />
                      <path d={roundedTopRectPath(x, failedY, BAR_WIDTH, failedHeight, CORNER_RADIUS)} fill="var(--red)" />
                    </>
                  ) : (
                    <path d={roundedTopRectPath(x, passedY, BAR_WIDTH, passedHeight, CORNER_RADIUS)} fill="var(--accent)" />
                  )}

                  <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT - 12} textAnchor="middle" fontSize="9" fill="var(--text-dim)">
                    {formatDateShort(r.startedAt)}
                  </text>
                </g>
              );
            })}

            <line x1={AXIS_WIDTH} x2={chartWidth} y1={baselineY} y2={baselineY} stroke="var(--border-2)" strokeWidth="1" />
          </svg>
        </div>
      )}

      {hovered && !showTable && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{hovered.suiteName} — {formatDateTime(hovered.startedAt)}</div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>
            {hovered.environmentName} · <span className={`tag ${STATUS_TAG[hovered.status] || ''}`}>{hovered.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>✓ Passed: <strong style={{ color: 'var(--accent)' }}>{hovered.passedCount}</strong></span>
            <span>✕ Failed: <strong style={{ color: 'var(--red)' }}>{hovered.failedCount}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
