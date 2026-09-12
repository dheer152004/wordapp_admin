import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

function PieChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 2;

  function polarToCartesian(cx, cy, r, angle) {
    return {
      x: cx + r * Math.cos(angle - Math.PI / 2),
      y: cy + r * Math.sin(angle - Math.PI / 2),
    };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  let angle = 0;
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
      <svg width={size} height={size} style={{ flex: '0 0 auto' }}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
        ) : (
          data.map((d, i) => {
            const sliceAngle = (d.value / total) * Math.PI * 2;
            const start = angle;
            const end = angle + sliceAngle;
            const path = describeArc(cx, cy, r, start, end);
            angle = end;
            return <path key={i} d={path} fill={d.color} stroke="#fff" strokeWidth={1} />;
          })
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 12, height: 12, background: d.color, borderRadius: 3, display: 'inline-block' }} />
            <div style={{ fontSize: 14 }}>
              <strong>{d.label}</strong> — {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/admin/reports')
      .then(res => {
        if (!mounted) return;
        var d = res.data;
        setReports(Array.isArray(d) ? d : (d && d.reports ? d.reports : []));
        setError(null);
      })
      .catch(err => {
        if (!mounted) return;
        var msg = (err && err.response && err.response.data && err.response.data.message) ? err.response.data.message : (err && err.message) ? err.message : 'Failed to load reports';
        setError(msg);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Prepare chart data
  const reasons = ['APP_IS_CRASHING','NOT_LOADING_WORDS','QUIZ_ISSUE','WRONG_INFO','NSFW','OTHER'];
  const colors = {
    APP_IS_CRASHING: '#ef4444', NOT_LOADING_WORDS: '#f59e0b', QUIZ_ISSUE: '#f97316', WRONG_INFO: '#fb7185', NSFW: '#a78bfa', OTHER: '#60a5fa'
  };
  const chartData = reasons.map(r => ({ label: r, value: reports.filter(x => x.reason === r).length, color: colors[r] || '#cbd5e1' }));

    return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1>Reports</h1>
        <div>
          <Link to="/dashboard" style={{ marginRight: 12 }}>
            Back
          </Link>
        </div>
      </div>

      {loading ? (
        <div>Loading reports...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <div>
          {reports && reports.length > 0 && (
            <PieChart data={chartData} />
          )}

          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 800,
              }}
            >
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Screenshots</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Reported By</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Resolved</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {r.id}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {r.reason}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                        maxWidth: 360,
                      }}
                    >
                      {r.description}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {Array.isArray(r.screenshotUrls) &&
                      r.screenshotUrls.length > 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {r.screenshotUrls.map((s, i) => (
                            <a
                              key={i}
                              href={s}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={s}
                                alt={`screenshot-${i}`}
                                style={{
                                  width: 80,
                                  height: 56,
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  border: '1px solid #e6e6e6',
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {r.reportMadeBy
                        ? `${r.reportMadeBy.username || r.reportMadeBy.email || '—'} (${
                            r.reportMadeBy.email || '—'
                          })`
                        : '—'}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : '—'}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      {r.resolved ? 'Yes' : 'No'}
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <button style={{ marginRight: 8 }} disabled>
                        View
                      </button>

                      <button disabled>Resolve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}