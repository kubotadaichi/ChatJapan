import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const accelerateUrl = process.env.POSTGRES_PRISMA_URL
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL

function createPrismaClient() {
  if (accelerateUrl?.startsWith('prisma://') || accelerateUrl?.startsWith('prisma+postgres://')) {
    return new PrismaClient({ accelerateUrl })
  }

  if (connectionString) {
    const adapter = new PrismaPg({ connectionString })
    return new PrismaClient({ adapter })
  }

  throw new Error('Set POSTGRES_PRISMA_URL (Accelerate) or POSTGRES_URL_NON_POOLING/POSTGRES_URL/DATABASE_URL')
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
