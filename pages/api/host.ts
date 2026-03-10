import type { NextApiRequest, NextApiResponse } from 'next'
import { readState, writeState, getStats, buildHistogram } from '../../lib/store'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action } = req.body
  const state = readState()

  if (action === 'reveal') {
    state.revealed = true
    writeState(state)
    return res.json({ ok: true })
  }

  if (action === 'next') {
    state.currentRound += 1
    state.revealed = false
    writeState(state)
    return res.json({ ok: true, round: state.currentRound })
  }

  if (action === 'reset') {
    writeState({ currentRound: 1, revealed: false, guesses: [] })
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: '未知操作' })
}
