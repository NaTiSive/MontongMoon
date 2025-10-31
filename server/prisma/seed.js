import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
const prisma = new PrismaClient()

async function main() {
  const ownerPw = await bcrypt.hash('owner12345', 10)
  await prisma.owner.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ownerName: 'Montong Owner', email: 'owner@example.com', passwordHash: ownerPw }
  })

  const brokerPw = await bcrypt.hash('broker12345', 10)
  await prisma.broker.upsert({
    where: { email: 'broker@example.com' },
    update: {},
    create: { brokerName: 'Best Broker', email: 'broker@example.com', phone: '0800000000', passwordHash: brokerPw, approvalStatus: 'approved' }
  })

  console.log('✅ Seed complete.')
}

main().finally(() => prisma.$disconnect())
