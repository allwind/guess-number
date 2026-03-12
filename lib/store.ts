import { kv } from '@vercel/kv'

const STATE_KEY = 'classroom:state'

export interface Guess {
  studentId: string
  round: number
  value: number
  timestamp: number
}

export type CollectStatus = 'idle' | 'collecting' | 'revealed'

export interface GameState {
  currentRound: number
  // idle = 尚未開始本輪, collecting = 收集中, revealed = 已揭曉
  status: CollectStatus
  guesses: Guess[]
}

const DEFAULT_STATE: GameState = {
  currentRound: 1,
  status: 'idle',
  guesses: [],
}

export async function readState(): Promise<GameState> {
  try {
    const data = await kv.get<GameState>(STATE_KEY)
    if (data) return data
  } catch {}
  return { ...DEFAULT_STATE }
}

export async function writeState(state: GameState): Promise<void> {
  await kv.set(STATE_KEY, state)
}

export function getStats(values: number[]) {
  if (values.length === 0) return { mean: 0, median: 0, std: 0, count: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  return { mean: +mean.toFixed(2), median: +median.toFixed(2), std: +std.toFixed(2), count: values.length }
}

export function buildHistogram(values: number[], bins = 10) {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const binSize = range / bins
  const buckets: { label: string; count: number; min: number; max: number }[] = []
  for (let i = 0; i < bins; i++) {
    const lo = min + i * binSize
    const hi = lo + binSize
    buckets.push({
      label: `${Math.round(lo)}–${Math.round(hi)}`,
      min: lo,
      max: hi,
      count: 0,
    })
  }
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binSize), bins - 1)
    buckets[idx].count++
  }
  return buckets
}
