import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '../src/server/db'

async function run() {
  const [email, name, role = 'editor'] = process.argv.slice(2)
  z.email().parse(email)
  z.string().min(1).max(100).parse(name)
  z.enum(['admin', 'editor']).parse(role)
  // Read from stdin to keep passwords out of shell history and process arguments.
  process.stdin.setEncoding('utf8')
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const password = input.trim()
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('Password must be at least 12 characters and at most 72 bytes.')
  await db().query('INSERT INTO staff(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)', [
    randomUUID(),
    email.toLowerCase(),
    name,
    await hash(password, 12),
    role,
  ])
  console.log(`Created ${role}: ${email}`)
}
run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db().end())
