import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHash, randomBytes } from 'node:crypto'
import { db } from './db'

export type Staff = {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor'
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export async function currentStaff(): Promise<Staff | null> {
  const token = (await cookies()).get('qn_session')?.value
  if (!token) return null
  const result = await db().query<Staff>(
    'SELECT s.id,s.name,s.email,s.role FROM staff s JOIN sessions t ON t.staff_id=s.id WHERE t.token_hash=$1 AND t.expires_at>now()',
    [tokenHash(token)],
  )
  return result.rows[0] || null
}
export async function requireStaff(admin = false): Promise<Staff> {
  const staff = await currentStaff()
  if (!staff) redirect('/login')
  if (admin && staff.role !== 'admin')
    throw new Error('Only administrators can publish or change integrations.')
  return staff
}
export async function createSession(staffId: string) {
  const token = randomBytes(32).toString('hex')
  await db().query(
    "INSERT INTO sessions(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
    [tokenHash(token), staffId],
  )
  ;(await cookies()).set('qn_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 43200,
  })
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const result = await db().query<{ hits: number }>(
    `INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.hits+1 END, reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE rate_limits.reset_at END RETURNING hits`,
    [key, seconds],
  )
  if (result.rows[0].hits > max) throw new Error('Too many attempts. Please try again later.')
}
