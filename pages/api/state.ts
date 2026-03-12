import type { NextApiRequest, NextApiResponse } from 'next'
import { readState } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const state = await readState()
  res.json({
    currentRound: state.currentRound,
    status: state.status,
    // keep revealed for backward compat with student page
    revealed: state.status === 'revealed',
  })
}
