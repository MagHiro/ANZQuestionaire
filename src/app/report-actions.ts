'use server'
import { z } from 'zod'
import { requireStaff } from '@/server/auth'
import { publishReport } from '@/server/reports'

export async function publishResponseReport(id: string) {
  await requireStaff(true)
  await publishReport(z.uuid().parse(id))
  return 'Report published. Notification queued if a respondent email is available.'
}
