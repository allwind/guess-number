import type { NextApiRequest, NextApiResponse } from 'next'
import { readState, writeState } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action } = req.body
  const state = await readState()

  // 開始收集本輪
  if (action === 'start') {
    state.status = 'collecting'
    await writeState(state)
    return res.json({ ok: true })
  }

  // 停止收集（揭曉）
  if (action === 'reveal') {
    state.status = 'revealed'
    await writeState(state)
    return res.json({ ok: true })
  }

  // 下一輪（進入 idle，等待主持人按開始）
  if (action === 'next') {
    state.currentRound += 1
    state.status = 'idle'
    await writeState(state)
    return res.json({ ok: true, round: state.currentRound })
  }

  // 重置一切
  if (action === 'reset') {
    await writeState({ currentRound: 1, status: 'idle', guesses: [] })
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: '未知操作' })
}
