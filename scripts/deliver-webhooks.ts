import 'dotenv/config'
import { createHmac } from 'node:crypto'
import { db } from '../src/server/db'

async function deliver() {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret || secret.length < 32)
    throw new Error('Configure WEBHOOK_SECRET with at least 32 characters.')
  const allowed = (process.env.WEBHOOK_ALLOWED_URLS || '').split(',').filter(Boolean)
  const client = await db().connect()
  try {
    // Row locks prevent concurrent workers from delivering the same event simultaneously.
    for (let count = 0; count < 50; count++) {
      await client.query('BEGIN')
      const result = await client.query<{
        id: string
        url: string
        payload: unknown
        attempts: number
      }>(
        'SELECT * FROM webhook_deliveries WHERE delivered_at IS NULL AND attempts<10 AND next_attempt<=now() ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1',
      )
      const item = result.rows[0]
      if (!item) {
        await client.query('COMMIT')
        break
      }
      try {
        if (!allowed.includes(item.url) || !item.url.startsWith('https://'))
          throw new Error('Destination is not allowlisted.')
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const body = JSON.stringify(item.payload)
        const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
        const response = await fetch(item.url, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: {
            'Content-Type': 'application/json',
            'X-Questionnaire-Timestamp': timestamp,
            'X-Questionnaire-Signature': signature,
            'X-Questionnaire-Event': item.id,
          },
          body,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await response.body?.cancel()
        await client.query(
          'UPDATE webhook_deliveries SET delivered_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1',
          [item.id],
        )
      } catch (error) {
        await client.query(
          `UPDATE webhook_deliveries SET attempts=attempts+1,next_attempt=now()+$2*interval '1 second',last_error=$3 WHERE id=$1`,
          [
            item.id,
            Math.min(86400, 60 * 2 ** item.attempts),
            error instanceof Error ? error.message : 'Delivery failed',
          ],
        )
        console.error(`Delivery ${item.id} failed; attempt ${item.attempts + 1}`)
      }
      await client.query('COMMIT')
    }
    await client.query("DELETE FROM rate_limits WHERE reset_at<now()-interval '1 day'")
    await client.query('DELETE FROM sessions WHERE expires_at<now()')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
deliver()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db().end())
