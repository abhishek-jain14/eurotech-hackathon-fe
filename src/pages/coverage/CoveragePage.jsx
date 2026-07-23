import { useEffect, useState } from "react";
import { getApplicationReportSummary } from "../../api/reportApi";
import { listApplications } from "../../api/applicationApi";

const DEFAULT_COVERAGE_ROWS = [
  {
    id: "payment",
    name: "PaymentAPI",
    subtitle: "OpenAPI 3.0 · 8 endpoints",
    endpoints: 8,
    coverage: 75,
    scenarios: 36,
    passed: 89,
    failed: 11,
    gaps: 5,
    status: "⚡ Partial",
    badgeClass: "tag tag-o",
    dotColor: "var(--accent)",
    detailRows: [
      { feature: "Make a Payment", positive: 4, negative: 2, passed: 18, failed: 6, flow: true, data: true, status: "⚠ Failures", statusClass: "tag tag-r" },
      { feature: "Refund a Payment", positive: 1, negative: 0, passed: 12, failed: 3, flow: false, data: false, status: "⚠ Failures", statusClass: "tag tag-r" },
      { feature: "View Payment History", positive: 2, negative: 0, passed: 8, failed: 0, flow: false, data: true, status: "⚡ Partial", statusClass: "tag tag-o" },
      { feature: "Get Payment Details", positive: 2, negative: 1, passed: 6, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "Cancel a Payment", positive: 1, negative: 0, passed: 12, failed: 2, flow: false, data: false, status: "⚠ Failures", statusClass: "tag tag-r" },
      { feature: "User Login", positive: 2, negative: 1, passed: 24, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "Subscribe to Alerts", positive: 1, negative: 0, passed: 9, failed: 0, flow: false, data: false, status: "⚡ Partial", statusClass: "tag tag-o" },
      { feature: "Token Refresh", positive: 0, negative: 0, passed: 0, failed: 0, flow: false, data: false, status: "✗ No Tests", statusClass: "tag tag-r" },
    ],
  },
  {
    id: "product",
    name: "ProductCatalogAPI",
    subtitle: "OpenAPI 3.0 · 5 endpoints",
    endpoints: 5,
    coverage: 60,
    scenarios: 8,
    passed: 48,
    failed: 0,
    gaps: 3,
    status: "⚠ Uncovered",
    badgeClass: "tag tag-r",
    dotColor: "var(--purple)",
    detailRows: [
      { feature: "Create Product", positive: 2, negative: 1, passed: 12, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "Search Products", positive: 2, negative: 0, passed: 14, failed: 0, flow: true, data: true, status: "⚡ Partial", statusClass: "tag tag-o" },
      { feature: "Get Product Details", positive: 1, negative: 0, passed: 12, failed: 0, flow: true, data: true, status: "⚡ Partial", statusClass: "tag tag-o" },
      { feature: "Update Product", positive: 0, negative: 0, passed: 0, failed: 0, flow: false, data: false, status: "✗ No Tests", statusClass: "tag tag-r" },
      { feature: "Delete Product", positive: 0, negative: 0, passed: 0, failed: 0, flow: false, data: false, status: "✗ No Tests", statusClass: "tag tag-r" },
    ],
  },
  {
    id: "userportal",
    name: "UserPortal UI",
    subtitle: "DOM / UI · 3 screens",
    endpoints: 3,
    coverage: 67,
    scenarios: 5,
    passed: 29,
    failed: 9,
    gaps: 2,
    status: "⚠ Failures",
    badgeClass: "tag tag-r",
    dotColor: "var(--orange)",
    detailRows: [
      { feature: "Login Screen", positive: 3, negative: 0, passed: 10, failed: 5, flow: true, data: true, status: "⚠ Failures", statusClass: "tag tag-r" },
      { feature: "Dashboard", positive: 1, negative: 0, passed: 12, failed: 0, flow: true, data: true, status: "✓ Pass", statusClass: "tag tag-g" },
      { feature: "Profile Edit", positive: 0, negative: 0, passed: 0, failed: 0, flow: false, data: false, status: "✗ No Tests", statusClass: "tag tag-r" },
    ],
  },
  {
    id: "orders",
    name: "OrderManagementAPI",
    subtitle: "OpenAPI 3.0 · 5 endpoints",
    endpoints: 5,
    coverage: 100,
    scenarios: 40,
    passed: 114,
    failed: 4,
    gaps: 0,
    status: "✓ Good",
    badgeClass: "tag tag-g",
    dotColor: "var(--purple)",
    detailRows: [
      { feature: "Place Order", positive: 3, negative: 2, passed: 28, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "Get Order Status", positive: 2, negative: 1, passed: 22, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "Cancel Order", positive: 2, negative: 2, passed: 30, failed: 4, flow: true, data: true, status: "⚡ Partial", statusClass: "tag tag-o" },
      { feature: "Update Order", positive: 2, negative: 1, passed: 18, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
      { feature: "List Orders", positive: 2, negative: 1, passed: 16, failed: 0, flow: true, data: true, status: "✓ Full", statusClass: "tag tag-g" },
    ],
  },
];

export default function CoveragePage() {
  const [openId, setOpenId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [coverageRows, setCoverageRows] = useState(DEFAULT_COVERAGE_ROWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCoverage = async () => {
      try {
        const appPage = await listApplications({ size: 100 });
        const appList = Array.isArray(appPage) ? appPage : appPage?.content || appPage?.items || [];

        if (!mounted) return;

        setApplications(appList);

        const rows = await Promise.all(
          appList.slice(0, 4).map(async (app, index) => {
            try {
              const summary = await getApplicationReportSummary(app.id);
              const coveragePercent = Math.round(summary?.passRatePercent ?? 0);
              return {
                id: String(app.id),
                name: app.name,
                subtitle: app.description || `Application • ${index + 1}`,
                endpoints: summary?.totalRuns ? Math.max(1, summary.totalRuns) : 5,
                coverage: coveragePercent,
                scenarios: summary?.totalPassed ?? 0,
                passed: summary?.totalPassed ?? 0,
                failed: summary?.totalFailed ?? 0,
                gaps: Math.max(0, 5 - index),
                status: coveragePercent >= 90 ? "✓ Good" : coveragePercent >= 70 ? "⚡ Partial" : "⚠ Uncovered",
                badgeClass: coveragePercent >= 90 ? "tag tag-g" : coveragePercent >= 70 ? "tag tag-o" : "tag tag-r",
                dotColor: index % 2 === 0 ? "var(--accent)" : "var(--purple)",
                detailRows: [
                  { feature: "Latest execution", positive: 1, negative: 0, passed: summary?.totalPassed ?? 0, failed: summary?.totalFailed ?? 0, flow: true, data: true, status: coveragePercent >= 90 ? "✓ Full" : "⚡ Partial", statusClass: coveragePercent >= 90 ? "tag tag-g" : "tag tag-o" },
                ],
              };
            } catch {
              return DEFAULT_COVERAGE_ROWS[index % DEFAULT_COVERAGE_ROWS.length];
            }
          }),
        );

        if (!mounted) return;
        setCoverageRows(rows.length ? rows : DEFAULT_COVERAGE_ROWS);
      } catch {
        if (!mounted) return;
        setCoverageRows(DEFAULT_COVERAGE_ROWS);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCoverage();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Coverage</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
            Test coverage and last execution results across all applications. Click Details on any row to drill in.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-lbl">Endpoint Coverage</div>
          <div className="stat-val" style={{ color: "var(--accent)" }}>79%</div>
          <div className="stat-delta up">19/24 endpoints</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Total Scenarios</div>
          <div className="stat-val">89</div>
          <div className="stat-delta">across 4 apps</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Last Run Passed</div>
          <div className="stat-val" style={{ color: "var(--accent)" }}>280</div>
          <div className="stat-delta up">94% pass rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Last Run Failed</div>
          <div className="stat-val" style={{ color: "var(--red)" }}>24</div>
          <div className="stat-delta dn">3 new failures</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Gaps to Fix</div>
          <div className="stat-val" style={{ color: "var(--orange)" }}>8</div>
          <div className="stat-delta dn">missing neg / data</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">Application Coverage</span>
          <span className="tag">{loading ? "Loading…" : `Run #142 · ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              <th style={{ padding: "9px 14px", textAlign: "left" }}>Application</th>
              <th style={{ padding: "9px 12px", textAlign: "center" }}>Endpoints</th>
              <th style={{ padding: "9px 12px", textAlign: "center" }}>Coverage %</th>
              <th style={{ padding: "9px 12px", textAlign: "center" }}>Scenarios</th>
              <th style={{ padding: "9px 12px", textAlign: "center", color: "var(--accent)" }}>Passed</th>
              <th style={{ padding: "9px 12px", textAlign: "center", color: "var(--red)" }}>Failed</th>
              <th style={{ padding: "9px 12px", textAlign: "center", color: "var(--orange)" }}>Gaps</th>
              <th style={{ padding: "9px 12px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "9px 12px", textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {coverageRows.map((row) => {
              const isOpen = openId === row.id;
              return (
                <>
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => setOpenId(isOpen ? null : row.id)}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.dotColor, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{row.name}</div>
                          <div style={{ fontSize: 9, color: "var(--text-dim)" }}>{row.subtitle}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "center", color: "var(--text-dim)" }}>{row.endpoints}</td>
                    <td style={{ padding: "11px 12px", textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: row.coverage === 100 ? "var(--accent)" : "var(--orange)" }}>{row.coverage}%</div>
                      <div style={{ width: 50, height: 4, background: "var(--surface-2)", borderRadius: 2, margin: "3px auto 0", overflow: "hidden" }}>
                        <div style={{ width: `${row.coverage}%`, height: "100%", background: row.coverage === 100 ? "var(--accent)" : "var(--orange)" }} />
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "center", fontWeight: 700 }}>{row.scenarios}</td>
                    <td style={{ padding: "11px 12px", textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>{row.passed}</td>
                    <td style={{ padding: "11px 12px", textAlign: "center", fontWeight: 700, color: "var(--red)" }}>{row.failed}</td>
                    <td style={{ padding: "11px 12px", textAlign: "center", color: "var(--orange)" }}>{row.gaps}</td>
                    <td style={{ padding: "11px 12px", textAlign: "center" }}><span className={row.badgeClass}>{row.status}</span></td>
                    <td style={{ padding: "11px 12px", textAlign: "center" }}>
                      <button className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); setOpenId(isOpen ? null : row.id); }}>
                        Details {isOpen ? "▴" : "▾"}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, background: "var(--surface-2)" }}>
                        <div style={{ padding: "14px 20px", borderTop: `2px solid ${row.dotColor}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
                            {row.name} — Endpoint Breakdown
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 12 }}>
                            <thead>
                              <tr style={{ background: "var(--surface-3)" }}>
                                <th style={{ padding: "6px 10px", textAlign: "left" }}>Feature / Endpoint</th>
                                <th style={{ padding: "6px 10px", textAlign: "center" }}>Positive</th>
                                <th style={{ padding: "6px 10px", textAlign: "center" }}>Negative</th>
                                <th style={{ padding: "6px 10px", textAlign: "center", color: "var(--accent)" }}>Passed</th>
                                <th style={{ padding: "6px 10px", textAlign: "center", color: "var(--red)" }}>Failed</th>
                                <th style={{ padding: "6px 10px", textAlign: "center" }}>{row.id === "userportal" ? "Screen" : "Flow"}</th>
                                <th style={{ padding: "6px 10px", textAlign: "center" }}>{row.id === "userportal" ? "Status" : "Data"}</th>
                                <th style={{ padding: "6px 10px", textAlign: "center" }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.detailRows.map((detail, index) => (
                                <tr key={`${row.id}-${detail.feature}`} style={{ borderTop: index === 0 ? "1px solid var(--border)" : undefined }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 700 }}>{detail.feature}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--accent)" }}>{detail.positive}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center" }}>{detail.negative}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--accent)", fontWeight: 700 }}>{detail.passed}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--red)", fontWeight: 700 }}>{detail.failed}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: detail.flow ? "var(--accent)" : "var(--red)" }}>{detail.flow ? "✓" : "✗"}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: detail.data === undefined ? undefined : detail.data ? "var(--accent)" : "var(--red)" }}>{detail.data === undefined ? "—" : detail.data ? "✓" : "✗"}</td>
                                  <td style={{ padding: "7px 10px" }}><span className={detail.statusClass}>{detail.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => window.alert("This would navigate to the scenarios view in the full app")}>→ View Scenarios</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => window.alert("This would trigger gap-fixing in the full app")}>✦ Fix Gaps</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
