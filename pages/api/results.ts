import type { NextApiRequest, NextApiResponse } from 'next'
import { readState, getStats, buildHistogram } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const state = await readState()
  const { currentRound, status, guesses } = state

  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1)
  const roundStats = rounds.map((r) => {
    const vals = guesses.filter((g) => g.round === r).map((g) => g.value)
    return { round: r, ...getStats(vals), histogram: buildHistogram(vals) }
  })

  const studentIds = Array.from(new Set(guesses.map((g) => g.studentId))).sort()
  const table = studentIds.map((id) => {
    const row: Record<string, string | number> = { id }
    for (const r of rounds) {
      const g = guesses.find((g) => g.studentId === id && g.round === r)
      row[`r${r}`] = g ? g.value : '—'
    }
    return row
  })

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

  // count for current round
  const currentRoundCount = guesses.filter(g => g.round === currentRound).length

  res.json({ currentRound, status, revealed: status === 'revealed', roundStats, table, adjustments, rounds, currentRoundCount })
}
