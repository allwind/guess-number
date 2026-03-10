import type { NextApiRequest, NextApiResponse } from 'next'
import { readState, getStats, buildHistogram } from '../../lib/store'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const state = readState()
  const { currentRound, revealed, guesses } = state

  // Build per-round stats
  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1)
  const roundStats = rounds.map((r) => {
    const vals = guesses.filter((g) => g.round === r).map((g) => g.value)
    return { round: r, ...getStats(vals), histogram: buildHistogram(vals) }
  })

  // Build per-student table
  const studentIds = [...new Set(guesses.map((g) => g.studentId))].sort()
  const table = studentIds.map((id) => {
    const row: Record<string, string | number> = { id }
    for (const r of rounds) {
      const g = guesses.find((g) => g.studentId === id && g.round === r)
      row[`r${r}`] = g ? g.value : '—'
    }
    return row
  })

  // Build adjustments (round n vs n-1)
  const adjustments =
    currentRound >= 2
      ? studentIds.map((id) => {
          const adj: Record<string, string | number> = { id }
          for (let r = 2; r <= currentRound; r++) {
            const prev = guesses.find((g) => g.studentId === id && g.round === r - 1)
            const curr = guesses.find((g) => g.studentId === id && g.round === r)
            if (prev && curr) {
              adj[`adj_${r - 1}_${r}`] = curr.value - prev.value
            } else {
              adj[`adj_${r - 1}_${r}`] = '—'
            }
          }
          return adj
        })
      : []

  res.json({ currentRound, revealed, roundStats, table, adjustments, rounds })
}
