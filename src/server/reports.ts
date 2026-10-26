import { db } from './db'
import { queueEmail } from './email'
import { confirmationUrl } from './respondent-access'

export async function publishReport(id: string) {
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ payment_status: string; respondent_email: string | null }>(
      'SELECT * FROM responses WHERE id=$1 FOR UPDATE',
      [id],
    )
    const row = result.rows[0]
    if (!row || !['paid', 'not_required'].includes(row.payment_status))
      throw new Error('Verified payment is required before publishing.')
    const report = await client.query(
      'UPDATE response_reports SET published_at=COALESCE(published_at,now()) WHERE response_id=$1 RETURNING response_id',
      [id],
    )
    if (!report.rows.length) throw new Error('Upload a report first.')
    if (row.respondent_email)
      await queueEmail(client, id, 'report', row.respondent_email, {
        questionnaire_title: 'Your questionnaire',
        message: 'Your report is ready to download using the private confirmation link.',
        status_url: confirmationUrl(id),
      })
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
