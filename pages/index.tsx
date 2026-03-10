import { useState, useEffect } from 'react'

interface GameState {
  currentRound: number
  revealed: boolean
}

export default function StudentPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [studentId, setStudentId] = useState('')
  const [guess, setGuess] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' })
  const [submittedRounds, setSubmittedRounds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

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
      const data = await res.json()
      setState(data)
    } catch {}
  }

  const hasSubmittedThisRound = state ? submittedRounds.includes(state.currentRound) : false

  async function handleSubmit() {
    if (!studentId.trim()) return setStatus({ type: 'error', msg: '請輸入學號' })
    const val = parseInt(guess)
    if (isNaN(val) || val < 0 || val > 100) return setStatus({ type: 'error', msg: '請輸入 0–100 的整數' })

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
        setStatus({ type: 'success', msg: `✓ 已提交：${val}` })
        setGuess('')
      } else {
        setStatus({ type: 'error', msg: data.error || '提交失敗' })
      }
    } catch {
      setStatus({ type: 'error', msg: '網路錯誤，請重試' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.label}>CLASSROOM EXPERIMENT</div>
          <div style={styles.roundBadge}>
            {state ? `第 ${state.currentRound} 輪` : '載入中…'}
          </div>
        </div>

        {/* Status indicator */}
        {state?.revealed && (
          <div style={styles.revealedBanner}>
            ⏸ 本輪已揭曉，等待下一輪開始
          </div>
        )}

        {/* Form */}
        <div style={styles.card}>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>學號</label>
            <input
              style={styles.input}
              type="text"
              placeholder="例：A01"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={10}
              disabled={hasSubmittedThisRound}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>猜測數字 <span style={styles.range}>(0–100)</span></label>
            <input
              style={styles.input}
              type="number"
              inputMode="numeric"
              placeholder="輸入整數"
              min={0}
              max={100}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={hasSubmittedThisRound || state?.revealed}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {status.msg && (
            <div style={{
              ...styles.statusMsg,
              background: status.type === 'success' ? 'rgba(71,255,178,0.1)' : 'rgba(255,107,107,0.1)',
              color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${status.type === 'success' ? 'rgba(71,255,178,0.3)' : 'rgba(255,107,107,0.3)'}`,
            }}>
              {status.msg}
            </div>
          )}

          <button
            style={{
              ...styles.btn,
              opacity: (hasSubmittedThisRound || state?.revealed || loading) ? 0.4 : 1,
              cursor: (hasSubmittedThisRound || state?.revealed || loading) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={hasSubmittedThisRound || state?.revealed || loading}
          >
            {loading ? '提交中…' : hasSubmittedThisRound ? '已提交 ✓' : '提交猜測'}
          </button>
        </div>

        {/* History */}
        {submittedRounds.length > 0 && (
          <div style={styles.historyCard}>
            <div style={styles.historyTitle}>提交紀錄</div>
            {submittedRounds.map(r => (
              <span key={r} style={styles.roundTag}>第 {r} 輪 ✓</span>
            ))}
          </div>
        )}

        <div style={styles.footer}>
          Host? <a href="/host" style={styles.link}>→ 主持人頁面</a>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: 'var(--muted)',
    textTransform: 'uppercase',
  },
  roundBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--accent)',
    background: 'rgba(232,255,71,0.08)',
    border: '1px solid rgba(232,255,71,0.25)',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  revealedBanner: {
    background: 'rgba(71,200,255,0.08)',
    border: '1px solid rgba(71,200,255,0.25)',
    color: 'var(--accent2)',
    padding: '10px 16px',
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
  },
  range: {
    fontWeight: 400,
    color: '#555',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '20px',
    fontWeight: 500,
    padding: '14px 16px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  statusMsg: {
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
  },
  btn: {
    background: 'var(--accent)',
    color: '#0d0d0f',
    border: 'none',
    borderRadius: '8px',
    padding: '15px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.15s',
    width: '100%',
  },
  historyCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    width: '100%',
    marginBottom: '4px',
  },
  roundTag: {
    background: 'rgba(71,255,178,0.08)',
    border: '1px solid rgba(71,255,178,0.2)',
    color: 'var(--success)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
  },
  footer: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--muted)',
    paddingTop: '8px',
  },
  link: {
    color: 'var(--accent2)',
    marginLeft: '4px',
  },
}
