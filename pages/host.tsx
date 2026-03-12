import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const HOST_PASSWORD = '5148'

type CollectStatus = 'idle' | 'collecting' | 'revealed'

interface RoundStat {
  round: number
  mean: number
  median: number
  std: number
  count: number
  histogram: { label: string; count: number; min: number; max: number }[]
}

interface ResultData {
  currentRound: number
  status: CollectStatus
  revealed: boolean
  roundStats: RoundStat[]
  table: Record<string, string | number>[]
  adjustments: Record<string, string | number>[]
  rounds: number[]
  currentRoundCount: number
}

// ── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  function attempt() {
    if (pw === HOST_PASSWORD) {
      sessionStorage.setItem('host_auth', '1')
      onUnlock()
    } else {
      setError(true)
      setPw('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>主持人登入</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>請輸入主持人密碼</div>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          placeholder="密碼"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          style={{
            border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 8, padding: '12px 14px', fontSize: 20,
            fontFamily: 'var(--font-mono)', outline: 'none', width: '100%',
            background: error ? 'var(--danger-light)' : '#fff', color: 'var(--text)',
          }}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>✗ 密碼錯誤</div>}
        <button onClick={attempt} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          進入
        </button>
        <a href="/" style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>← 返回學生頁面</a>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color }: { label: string; value: number; unit?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontFamily: 'var(--font-mono)', fontWeight: 600, color: color || 'var(--accent)' }}>
        {value}<span style={{ fontSize: 13, marginLeft: 2, color: 'var(--muted)' }}>{unit}</span>
      </div>
    </div>
  )
}

const ROUND_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706']

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CollectStatus }) {
  const cfg = {
    idle: { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', label: '待機中' },
    collecting: { bg: '#dcfce7', border: '#bbf7d0', color: '#16a34a', label: '● 收集中' },
    revealed: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', label: '已揭曉' },
  }[status]
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
      {cfg.label}
    </span>
  )
}

// ── Host page ─────────────────────────────────────────────────────────────────
export default function HostPage() {
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [tab, setTab] = useState<'stats' | 'table' | 'adjust'>('stats')

  useEffect(() => {
    if (sessionStorage.getItem('host_auth') === '1') setAuthed(true)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/results')
      const d = await res.json()
      setData(d)
    } catch {}
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchData()
    const iv = setInterval(fetchData, 3000)
    return () => clearInterval(iv)
  }, [authed, fetchData])

  async function hostAction(action: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await res.json()
      if (res.ok) {
        const msgs: Record<string, string> = {
          start: '✓ 開始收集',
          reveal: '✓ 已停止收集，結果揭曉',
          next: `✓ 已進入第 ${d.round} 輪（待機）`,
          reset: '✓ 已重置所有資料',
        }
        setActionMsg(msgs[action] || '✓')
        await fetchData()
        setTimeout(() => setActionMsg(''), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />

  // Control buttons based on current status
  function renderControls() {
    if (!data) return null
    const { status } = data
    return (
      <div style={s.controls}>
        {status === 'idle' && (
          <button style={{ ...s.btn, background: '#16a34a' }} onClick={() => hostAction('start')} disabled={loading}>
            ▶ 開始收集
          </button>
        )}
        {status === 'collecting' && (
          <button style={{ ...s.btn, background: '#d97706' }} onClick={() => hostAction('reveal')} disabled={loading}>
            ⏹ 停止收集 / 揭曉
          </button>
        )}
        {status === 'revealed' && (
          <button style={{ ...s.btn, background: '#0891b2' }} onClick={() => hostAction('next')} disabled={loading}>
            下一輪 →
          </button>
        )}
        <button style={s.btnDanger} onClick={() => { if (confirm('確定重置所有資料？此操作無法還原。')) hostAction('reset') }} disabled={loading}>
          重置
        </button>
      </div>
    )
  }

  // Merge all rounds' histograms for overlay chart
  function buildOverlayHistogram() {
    if (!data || data.roundStats.length === 0) return []
    const allLabels = new Map<string, number>()
    data.roundStats.forEach(rs => {
      rs.histogram.forEach(b => { if (!allLabels.has(b.label)) allLabels.set(b.label, b.min) })
    })
    const sorted = Array.from(allLabels.entries()).sort((a, b) => a[1] - b[1])
    return sorted.map(([label]) => {
      const row: { label: string; [key: string]: number | string } = { label }
      data.roundStats.forEach(rs => {
        const bin = rs.histogram.find(b => b.label === label)
        row[`r${rs.round}`] = bin ? bin.count : 0
      })
      return row
    })
  }

  const overlayData = buildOverlayHistogram()
  const showResults = data && (data.status === 'revealed' || data.rounds.some(r => r < data.currentRound))

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={s.topLabel}>HOST DASHBOARD</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {data && <div style={s.roundInfo}>第 {data.currentRound} 輪</div>}
              {data && <StatusBadge status={data.status} />}
            </div>
          </div>
          {renderControls()}
        </div>

        {actionMsg && (
          <div style={{ background: 'var(--success-light)', border: '1px solid #bbf7d0', color: 'var(--success)', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
            {actionMsg}
          </div>
        )}

        {/* Live count */}
        {data && (
          <div style={{
            background: data.status === 'collecting' ? '#dcfce7' : '#f8fafc',
            border: `1px solid ${data.status === 'collecting' ? '#bbf7d0' : '#e2e8f0'}`,
            color: data.status === 'collecting' ? '#15803d' : '#64748b',
            padding: '12px 16px', borderRadius: 8, fontSize: 14,
          }}>
            {data.status === 'collecting'
              ? `📥 本輪已收到 ${data.currentRoundCount} 份回覆，持續更新中…`
              : data.status === 'idle'
              ? '按下「開始收集」後，學生才可以提交猜測'
              : `本輪共收到 ${data.currentRoundCount} 份回覆`
            }
          </div>
        )}

        {/* Results (show if revealed, or have previous rounds) */}
        {showResults && (
          <>
            <div style={s.tabBar}>
              {(['stats', 'table', 'adjust'] as const).map(t => (
                <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
                  {{ stats: '📊 統計與分佈', table: '📋 猜測總表', adjust: '↕ 調整幅度' }[t]}
                </button>
              ))}
            </div>

            {/* Stats tab */}
            {tab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data!.roundStats
                  .filter(rs => rs.count > 0)
                  .map((rs, i) => (
                  <div key={rs.round} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: ROUND_COLORS[i % ROUND_COLORS.length] }} />
                      <div style={{ fontSize: 13, fontWeight: 700 }}>第 {rs.round} 輪</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{rs.count} 人回覆</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      <StatCard label="平均值" value={rs.mean} color={ROUND_COLORS[i % ROUND_COLORS.length]} />
                      <StatCard label="中位數" value={rs.median} color={ROUND_COLORS[i % ROUND_COLORS.length]} />
                      <StatCard label="標準差" value={rs.std} color={ROUND_COLORS[i % ROUND_COLORS.length]} />
                    </div>
                  </div>
                ))}

                {overlayData.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                      分佈直方圖{data!.rounds.length > 1 ? '（各輪並排）' : ''}
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={overlayData} margin={{ top: 4, right: 8, bottom: 36, left: -10 }}>
                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'DM Mono' }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }}
                          formatter={(v: number, name: string) => [v, `第 ${parseInt(name.replace('r', ''))} 輪`]}
                        />
                        {data!.rounds.length > 1 && (
                          <Legend formatter={(v) => `第 ${parseInt(v.replace('r', ''))} 輪`} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Mono', paddingTop: 8 }} />
                        )}
                        {data!.rounds.map((r, i) => (
                          <Bar key={r} dataKey={`r${r}`} fill={ROUND_COLORS[i % ROUND_COLORS.length]} radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Table tab */}
            {tab === 'table' && (
              <div style={s.tableWrapper}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <th style={s.th}>學號</th>
                      {data!.rounds.map(r => (
                        <th key={r} style={{ ...s.th, color: ROUND_COLORS[(r - 1) % ROUND_COLORS.length] }}>第 {r} 輪</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data!.table.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                        <td style={{ ...s.td, fontWeight: 600 }}>{row.id}</td>
                        {data!.rounds.map(r => <td key={r} style={s.td}>{row[`r${r}`]}</td>)}
                      </tr>
                    ))}
                    {data!.table.length === 0 && (
                      <tr><td colSpan={data!.rounds.length + 1} style={s.emptyMsg}>尚無資料</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Adjust tab */}
            {tab === 'adjust' && (
              <div style={s.tableWrapper}>
                {data!.rounds.length < 2 ? (
                  <div style={s.emptyMsg}>需要至少兩輪才能顯示調整幅度</div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr style={{ background: 'var(--surface2)' }}>
                        <th style={s.th}>學號</th>
                        {data!.rounds.map(r => <th key={r} style={s.th}>第 {r} 輪</th>)}
                        {data!.rounds.slice(1).map(r => (
                          <th key={`adj${r}`} style={{ ...s.th, fontSize: 11 }}>R{r - 1}→R{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data!.adjustments.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                          <td style={{ ...s.td, fontWeight: 600 }}>{row.id}</td>
                          {data!.rounds.map(r => {
                            const tableRow = data!.table.find(t => t.id === row.id)
                            return <td key={r} style={{ ...s.td, color: 'var(--muted)' }}>{tableRow ? tableRow[`r${r}`] : '—'}</td>
                          })}
                          {data!.rounds.slice(1).map(r => {
                            const val = row[`adj_${r - 1}_${r}`]
                            const num = typeof val === 'number' ? val : null
                            return (
                              <td key={`adj${r}`} style={{
                                ...s.td,
                                fontWeight: num !== null && num !== 0 ? 700 : 400,
                                color: num === null ? 'var(--muted)' : num > 0 ? '#16a34a' : num < 0 ? '#dc2626' : 'var(--muted)',
                              }}>
                                {num !== null ? (num > 0 ? `+${num}` : num) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', paddingTop: 8 }}>
          <a href="/" style={{ color: 'var(--muted)' }}>← 學生頁面</a>
          <span style={{ margin: '0 12px' }}>·</span>
          <span style={{ cursor: 'pointer' }} onClick={() => { sessionStorage.removeItem('host_auth'); location.reload() }}>登出</span>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: 'var(--bg)', padding: '24px 16px' },
  container: { maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  topBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' as const },
  topLabel: { fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 },
  roundInfo: { fontSize: '20px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' },
  controls: { display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center' },
  btn: { color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  btnDanger: { background: 'transparent', color: 'var(--danger)', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  tabBar: { display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  tab: { flex: 1, background: 'transparent', border: 'none', color: 'var(--muted)', padding: '9px 8px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, whiteSpace: 'nowrap' as const },
  tabActive: { background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 },
  tableWrapper: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflowX: 'auto', boxShadow: 'var(--shadow)' },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  th: { padding: '11px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 14px', textAlign: 'center', color: 'var(--text)', borderBottom: '1px solid var(--border)' },
  emptyMsg: { padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '14px' },
}
