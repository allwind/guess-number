import type { NextApiRequest, NextApiResponse } from 'next'
import Redis from 'ioredis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.REDIS_URL || 'NOT SET'
  const results: Record<string, string> = {
    redis_url_set: url !== 'NOT SET' ? 'yes' : 'NO - missing env var',
    redis_url_prefix: url.substring(0, 15) + '...',
  }

  // Try without TLS first
  try {
    const client = new Redis(url, { tls: {}, maxRetriesPerRequest: 1, connectTimeout: 5000 })
    await client.set('debug_test', 'hello')
    const val = await client.get('debug_test')
    results['tls_connect'] = 'OK'
    results['write_read'] = val === 'hello' ? 'OK' : `FAIL: got ${val}`
    await client.quit()
  } catch (e: unknown) {
    results['tls_connect'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Try without TLS
  try {
    const client2 = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 5000 })
    await client2.set('debug_test2', 'world')
    const val2 = await client2.get('debug_test2')
    results['no_tls_connect'] = 'OK'
    results['no_tls_write_read'] = val2 === 'world' ? 'OK' : `FAIL: got ${val2}`
    await client2.quit()
  } catch (e: unknown) {
    results['no_tls_connect'] = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  res.json(results)
}
