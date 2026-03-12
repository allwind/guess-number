import { useState, useEffect, useRef } from 'react'

type CollectStatus = 'idle' | 'collecting' | 'revealed'

interface GameState {
  currentRound: number
  status: CollectStatus
  revealed: boolean
}

export default function StudentPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [studentId, setStudentId] = useState('')
  const [guess, setGuess] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' })
  const [submittedRounds, setSubmittedRounds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const lastRoundRef = useRef<number | null>(null)

  useEffect(() => {
    const savedId = sessionStorage.getItem('studentId') || ''
    const savedRounds = JSON.parse(sessionStorage.getItem('submittedRounds') || '[]')
    if (savedId) setStudentId(savedId)
    setSubmittedRounds(savedRounds)
    fetchState()
    const interval = setInterval(fetchState, 3000)
    return () => clearInterval(interval)
  }, [])

  async function fetchState() {
    try {
      const res = await fetch('/api/state')
      const data: GameState = await res.json()

      setState(prev => {
        const prevRound = lastRoundRef.current

        // Reset detected: round dropped back to 1 from higher
        if (prevRound !== null && data.currentRound === 1 && prevRound > 1) {
          setSubmittedRounds([])
          sessionStorage.removeItem('submittedRounds')
          setStatusMsg({ type: '', msg: '' })
          setGuess('')
        }

        // New round started
        if (prevRound !== null && data.currentRound > prevRound) {
          setStatusMsg({ type: '', msg: '' })
          setGuess('')
          const saved = JSON.parse(sessionStorage.getItem('submittedRounds') || '[]')
          setSubmittedRounds(saved)
        }

        lastRoundRef.current = data.currentRound
        return data
      })
    } catch {}
  }

  const hasSubmittedThisRound = state ? submittedRounds.includes(state.currentRound) : false
  const canSubmit = !hasSubmittedThisRound && state?.status === 'collecting' && !loading

  async function handleSubmit() {
    if (!studentId.trim()) return setStatusMsg({ type: 'error', msg: '請輸入學號' })
    const val = parseInt(guess)
    if (isNaN(val) || !Number.isInteger(val)) return setStatusMsg({ type: 'error', msg: '請輸入整數' })

    setLoading(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim().toUpperCase(), value: val }),
      })
      const data = await res.json()
      if (res.ok) {
        sessionStorage.setItem('studentId', studentId.trim().toUpperCase())
        const newRounds = [...submittedRounds, state!.currentRound]
        setSubmittedRounds(newRounds)
        sessionStorage.setItem('submittedRounds', JSON.stringify(newRounds))
        setStatusMsg({ type: 'success', msg: `已提交：${val}` })
        setGuess('')
      } else {
        setStatusMsg({ type: 'error', msg: data.error || '提交失敗' })
      }
    } catch {
      setStatusMsg({ type: 'error', msg: '網路錯誤，請重試' })
    } finally {
      setLoading(false)
    }
  }

  // Status banner content
  function renderBanner() {
    if (!state) return null
    if (state.status === 'idle') {
      return (
        <div style={{ ...st.banner, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
          ⏳ 等待主持人開始收集…
        </div>
      )
    }
    if (state.status === 'revealed') {
      return (
        <div style={{ ...st.banner, background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
          ⏸ 本輪已結束，等待下一輪開始
        </div>
      )
    }
    return null // collecting — no banner, form is active
  }

  return (
    <div style={st.page}>
      <div style={st.container}>

        <div style={st.header}>
          <div>
            <div style={st.appName}>課堂猜數字</div>
            <div style={st.appSub}>Classroom Experiment</div>
          </div>
          <div style={{
            ...st.roundPill,
            background: state?.status === 'collecting' ? '#dcfce7' : 'var(--accent-light)',
            border: `1px solid ${state?.status === 'collecting' ? '#bbf7d0' : '#bfdbfe'}`,
            color: state?.status === 'collecting' ? '#16a34a' : 'var(--accent)',
          }}>
            {state ? `第 ${state.currentRound} 輪` : '…'}
            {state?.status === 'collecting' && ' · 收集中'}
          </div>
        </div>

        {renderBanner()}

        <div style={st.card}>
          <div style={st.fieldGroup}>
            <label style={st.label}>學號</label>
            <input
              style={{ ...st.input, background: hasSubmittedThisRound ? 'var(--surface2)' : '#fff' }}
              type="text"
              placeholder="例：A01"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={10}
              disabled={hasSubmittedThisRound}
            />
          </div>

          <div style={st.fieldGroup}>
            <label style={st.label}>猜測數字</label>
            <input
              style={{ ...st.input, fontSize: '26px', background: canSubmit ? '#fff' : 'var(--surface2)' }}
              type="number"
              inputMode="numeric"
              placeholder="輸入整數"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={!canSubmit}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            />
          </div>

          {statusMsg.msg && (
            <div style={{
              ...st.statusMsg,
              background: statusMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {statusMsg.type === 'success' ? '✓ ' : '✗ '}{statusMsg.msg}
            </div>
          )}

          <button
            style={{
              ...st.btn,
              background: canSubmit ? 'var(--accent)' : '#e5e7eb',
              color: canSubmit ? '#fff' : '#9ca3af',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? '提交中…' : hasSubmittedThisRound ? '✓ 已提交' : state?.status === 'idle' ? '等待開始' : state?.status === 'revealed' ? '本輪已結束' : '提交猜測'}
          </button>
        </div>

        {submittedRounds.length > 0 && (
          <div style={st.historyCard}>
            <span style={st.historyLabel}>已提交：</span>
            {submittedRounds.map(r => (
              <span key={r} style={st.roundTag}>第 {r} 輪 ✓</span>
            ))}
          </div>
        )}

        <div style={st.footer}>
          <a href="/host" style={st.hostLink}>主持人頁面 →</a>
        </div>
      </div>
    </div>
  )
}

const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'var(--bg)',
  },
  container: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  appName: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  },
  appSub: {
    fontSize: '12px',
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    marginTop: '2px',
  },
  roundPill: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: '20px',
    transition: 'all 0.3s',
  },
  banner: {
    padding: '11px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    fontWeight: 500,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: 'var(--shadow)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  input: {
    border: '1.5px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '18px',
    fontWeight: 500,
    padding: '12px 14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  statusMsg: {
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 500,
  },
  btn: {
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
    transition: 'opacity 0.15s',
    width: '100%',
  },
  historyCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center',
    boxShadow: 'var(--shadow)',
  },
  historyLabel: {
    fontSize: '13px',
    color: 'var(--muted)',
    fontWeight: 500,
  },
  roundTag: {
    background: 'var(--success-light)',
    border: '1px solid #bbf7d0',
    color: 'var(--success)',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
  footer: {
    textAlign: 'center',
    paddingTop: '4px',
  },
  hostLink: {
    fontSize: '13px',
    color: 'var(--muted)',
  },
}
