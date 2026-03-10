import type { NextApiRequest, NextApiResponse } from 'next'
import { readState } from '../../lib/store'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const state = readState()
  res.json({
    currentRound: state.currentRound,
    revealed: state.revealed,
  })
}
