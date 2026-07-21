import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const acknowledgement = process.env.BOOTSTRAP_ACKNOWLEDGEMENT
const email = process.env.PROVISION_ADMIN_EMAIL?.trim().toLowerCase()
const name = process.env.PROVISION_ADMIN_NAME?.trim() || 'Runtime Administrator'
const password = process.env.PROVISION_ADMIN_PASSWORD

if (acknowledgement !== 'create-initial-admin') {
  throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required')
}
if (!email || !password || password.length < 12) {
  throw new Error('PROVISION_ADMIN_EMAIL and a 12+ character PROVISION_ADMIN_PASSWORD are required')
}
const adminEmail: string = email
const adminPassword: string = password

const [firstName, ...remainingName] = name.split(/\s+/)
const lastName = remainingName.join(' ') || 'Administrator'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
  if (existing) throw new Error(`Refusing to replace existing account for ${adminEmail}`)

  const clinic = await prisma.clinic.upsert({
    where: { id: 'runtime-acceptance-clinic' },
    update: {},
    create: { id: 'runtime-acceptance-clinic', name: 'Runtime Acceptance Clinic' },
  })
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 12),
      firstName,
      lastName,
      role: UserRole.ADMIN,
      clinicId: clinic.id,
      isActive: true,
    },
  })
  console.log(`Created initial administrator ${adminEmail}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
