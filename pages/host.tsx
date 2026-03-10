import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface RoundStat {
  round: number
  mean: number
  median: number
  std: number
  count: number
  histogram: { label: string; count: number }[]
}

interface ResultData {
  currentRound: number
  revealed: boolean
  roundStats: RoundStat[]
  table: Record<string, string | number>[]
  adjustments: Record<string, string | number>[]
  rounds: number[]
}

export default function HostPage() {
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [activeRound, setActiveRound] = useState(1)
  const [tab, setTab] = useState<'table' | 'stats' | 'adjust'>('stats')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/results')
      const d = await res.json()
      setData(d)
      setActiveRound(d.currentRound)
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 3000)
    return () => clearInterval(iv)
  }, [fetchData])

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
        setActionMsg(action === 'reveal' ? '✓ 結果已揭曉' : action === 'next' ? `✓ 已進入第 ${d.round} 輪` : '✓ 已重置')
        await fetchData()
        setTimeout(() => setActionMsg(''), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  const currentStat = data?.roundStats.find(r => r.round === activeRound)

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <div style={s.topLabel}>HOST DASHBOARD</div>
            {data && (
              <div style={s.roundInfo}>
                第 {data.currentRound} 輪 · {data.revealed ? '已揭曉' : '進行中'}
                {data.table.length > 0 && ` · ${data.table.length} 名學生`}
              </div>
            )}
          </div>
          <div style={s.controls}>
            {!data?.revealed ? (
              <button style={{ ...s.btnPrimary, background: 'var(--accent2)' }} onClick={() => hostAction('reveal')} disabled={loading}>
                揭曉結果
              </button>
            ) : (
              <button style={s.btnPrimary} onClick={() => hostAction('next')} disabled={loading}>
                下一輪 →
              </button>
            )}
            <button style={s.btnDanger} onClick={() => { if (confirm('確定重置所有資料？')) hostAction('reset') }} disabled={loading}>
              重置
            </button>
          </div>
        </div>

        {actionMsg && <div style={s.actionBanner}>{actionMsg}</div>}

        {!data?.revealed && (
          <div style={s.waitBanner}>
            ⏳ 等待學生提交中… ({data?.table.length ?? 0} 人已提交)
          </div>
        )}

        {data?.revealed && (
          <>
            {/* Round selector */}
            {data.rounds.length > 1 && (
              <div style={s.roundTabs}>
                {data.rounds.map(r => (
                  <button
                    key={r}
                    style={{ ...s.roundTab, ...(activeRound === r ? s.roundTabActive : {}) }}
                    onClick={() => setActiveRound(r)}
                  >
                    第 {r} 輪
                  </button>
                ))}
              </div>
            )}

            {/* Tab selector */}
            <div style={s.tabBar}>
              {(['stats', 'table', 'adjust'] as const).map(t => (
                <button
                  key={t}
                  style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
                  onClick={() => setTab(t)}
                >
                  {{ stats: '統計', table: '猜測總表', adjust: '調整幅度' }[t]}
                </button>
              ))}
            </div>

            {/* Stats tab */}
            {tab === 'stats' && currentStat && (
              <div style={s.statsSection}>
                <div style={s.statsGrid}>
                  <StatCard label="平均值" value={currentStat.mean} unit="" />
                  <StatCard label="中位數" value={currentStat.median} unit="" />
                  <StatCard label="標準差" value={currentStat.std} unit="" />
                  <StatCard label="回覆數" value={currentStat.count} unit="人" />
                </div>
                {currentStat.histogram.length > 0 && (
                  <div style={s.chartCard}>
                    <div style={s.chartTitle}>分佈直方圖 — 第 {activeRound} 輪</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={currentStat.histogram} margin={{ top: 8, right: 8, bottom: 32, left: -10 }}>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#7a7a8c', fontSize: 10, fontFamily: 'DM Mono' }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: '#7a7a8c', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: '#16161a', border: '1px solid #2a2a35', borderRadius: 8, fontFamily: 'DM Mono', fontSize: 12 }}
                          labelStyle={{ color: '#f0f0f0' }}
                          itemStyle={{ color: '#e8ff47' }}
                          formatter={(v: number) => [v, '人數']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {currentStat.histogram.map((_, i) => (
                            <Cell key={i} fill={i % 2 === 0 ? '#e8ff47' : '#47c8ff'} />
                          ))}
                        </Bar>
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
                    <tr>
                      <th style={s.th}>學號</th>
                      {data.rounds.map(r => (
                        <th key={r} style={s.th}>第 {r} 輪</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.table.map((row, i) => (
                      <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                        <td style={{ ...s.td, ...s.tdId }}>{row.id}</td>
                        {data.rounds.map(r => (
                          <td key={r} style={s.td}>{row[`r${r}`]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Adjustment tab */}
            {tab === 'adjust' && (
              <div style={s.tableWrapper}>
                {data.rounds.length < 2 ? (
                  <div style={s.emptyMsg}>需要至少兩輪才能顯示調整幅度</div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>學號</th>
                        {data.rounds.slice(1).map(r => (
                          <th key={r} style={s.th}>R{r-1}→R{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.adjustments.map((row, i) => (
                        <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                          <td style={{ ...s.td, ...s.tdId }}>{row.id}</td>
                          {data.rounds.slice(1).map(r => {
                            const val = row[`adj_${r-1}_${r}`]
                            const num = typeof val === 'number' ? val : null
                            return (
                              <td key={r} style={{
                                ...s.td,
                                color: num === null ? 'var(--muted)' : num > 0 ? '#47ffb2' : num < 0 ? '#ff6b6b' : 'var(--text)',
                                fontWeight: num !== null && num !== 0 ? 600 : 400,
                              }}>
                                {num !== null ? (num > 0 ? `+${num}` : num) : val}
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

        <div style={s.footer}>
          學生頁面 → <a href="/" style={{ color: 'var(--accent2)', marginLeft: 4 }}>首頁</a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--accent)' }}>
        {value}<span style={{ fontSize: '14px', marginLeft: 2, color: 'var(--muted)' }}>{unit}</span>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: 'var(--bg)', padding: '24px 16px' },
  container: { maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  topBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  topLabel: { fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' },
  roundInfo: { fontSize: '18px', fontWeight: 600, color: 'var(--text)' },
  controls: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  btnPrimary: { background: 'var(--accent)', color: '#0d0d0f', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  btnDanger: { background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  actionBanner: { background: 'rgba(71,255,178,0.1)', border: '1px solid rgba(71,255,178,0.25)', color: 'var(--success)', padding: '10px 16px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '14px' },
  waitBanner: { background: 'rgba(71,200,255,0.07)', border: '1px solid rgba(71,200,255,0.2)', color: 'var(--accent2)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-mono)' },
  roundTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  roundTab: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  roundTabActive: { background: 'rgba(232,255,71,0.1)', border: '1px solid rgba(232,255,71,0.3)', color: 'var(--accent)' },
  tabBar: { display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' },
  tab: { flex: 1, background: 'transparent', border: 'none', color: 'var(--muted)', padding: '8px', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 },
  tabActive: { background: 'var(--surface2)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  statsSection: { display: 'flex', flexDirection: 'column', gap: '16px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  chartCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' },
  chartTitle: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' },
  tableWrapper: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  th: { padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' },
  td: { padding: '11px 16px', textAlign: 'center', color: 'var(--text)', borderBottom: '1px solid rgba(42,42,53,0.6)' },
  tdId: { color: 'var(--accent2)', fontWeight: 600 },
  trEven: { background: 'rgba(255,255,255,0.02)' },
  emptyMsg: { padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '14px' },
  footer: { textAlign: 'center', fontSize: '13px', color: 'var(--muted)', paddingTop: '8px' },
}
