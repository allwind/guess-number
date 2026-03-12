import Redis from 'ioredis'

let client: Redis | null = null

function getClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL!
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
    })
    client.on('error', (err) => {
      console.error('Redis error:', err)
      client = null
    })
  }
  return client
}

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
    const raw = await getClient().get(STATE_KEY)
    if (raw) return JSON.parse(raw) as GameState
  } catch (e) {
    console.error('Redis read error:', e)
    client = null
  }
  return { ...DEFAULT_STATE, guesses: [] }
}

export async function writeState(state: GameState): Promise<void> {
  try {
    await getClient().set(STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Redis write error:', e)
    client = null
  }
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
