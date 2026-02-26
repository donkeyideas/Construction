"use client";

/**
 * Skeleton loading placeholder for transaction pages.
 * Shows 4 KPI card placeholders + a table skeleton.
 */
export default function TransactionSkeleton() {
  return (
    <div className="section-txn-wrapper">
      {/* KPI Skeleton */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card kpi" style={{ minHeight: 90 }}>
            <div className="kpi-info">
              <span className="skel-line" style={{ width: 100, height: 12, marginBottom: 8 }} />
              <span className="skel-line" style={{ width: 70, height: 22 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span className="skel-line" style={{ width: 180, height: 16 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="invoice-table section-txn-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}><span className="skel-line" style={{ width: 40, height: 12 }} /></th>
                <th><span className="skel-line" style={{ width: 90, height: 12 }} /></th>
                <th><span className="skel-line" style={{ width: 70, height: 12 }} /></th>
                <th><span className="skel-line" style={{ width: 50, height: 12 }} /></th>
                <th style={{ textAlign: "right" }}><span className="skel-line" style={{ width: 40, height: 12, marginLeft: "auto" }} /></th>
                <th style={{ textAlign: "right" }}><span className="skel-line" style={{ width: 40, height: 12, marginLeft: "auto" }} /></th>
                <th><span className="skel-line" style={{ width: 30, height: 12 }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td><span className="skel-line" style={{ width: 75, height: 12 }} /></td>
                  <td><span className="skel-line" style={{ width: `${50 + (i % 3) * 20}%`, height: 12 }} /></td>
                  <td><span className="skel-line" style={{ width: 60, height: 12 }} /></td>
                  <td><span className="skel-line" style={{ width: 70, height: 12 }} /></td>
                  <td style={{ textAlign: "right" }}><span className="skel-line" style={{ width: 60, height: 12, marginLeft: "auto" }} /></td>
                  <td style={{ textAlign: "right" }}><span className="skel-line" style={{ width: 60, height: 12, marginLeft: "auto" }} /></td>
                  <td><span className="skel-line" style={{ width: 50, height: 12 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .skel-line {
          display: inline-block;
          background: linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%);
          background-size: 200% 100%;
          animation: skel-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
        }
        @keyframes skel-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
