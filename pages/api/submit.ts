import type { NextApiRequest, NextApiResponse } from 'next'
import { readState, writeState, Guess } from '../../lib/store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { studentId, value } = req.body
  if (!studentId || typeof value !== 'number') {
    return res.status(400).json({ error: '請填寫學號與猜測數字' })
  }
  if (!Number.isInteger(value)) {
    return res.status(400).json({ error: '請輸入整數' })
  }

  const state = await readState()

  if (state.status !== 'collecting') {
    return res.status(400).json({ error: state.status === 'idle' ? '尚未開始收集，請等待主持人開始' : '本輪已結束，等待下一輪開始' })
  }

  const id = String(studentId).trim().toUpperCase()
  const alreadySubmitted = state.guesses.some(
    (g) => g.studentId === id && g.round === state.currentRound
  )
  if (alreadySubmitted) {
    return res.status(400).json({ error: '您本輪已提交過猜測' })
  }

  const guess: Guess = {
    studentId: id,
    round: state.currentRound,
    value,
    timestamp: Date.now(),
  }
  state.guesses.push(guess)
  await writeState(state)

  res.json({ ok: true, message: `已提交：${value}` })
}
