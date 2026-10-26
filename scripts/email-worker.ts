import 'dotenv/config'
import { processEmailJobs } from '../src/server/email'

while (true) {
  try {
    await processEmailJobs()
  } catch {
    console.error('Email worker could not process jobs.')
  }
  await new Promise((resolve) => setTimeout(resolve, 30000))
}
