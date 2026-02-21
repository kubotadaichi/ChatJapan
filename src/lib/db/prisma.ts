import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const accelerateUrl = process.env.POSTGRES_PRISMA_URL
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL

  if (accelerateUrl?.startsWith('prisma://') || accelerateUrl?.startsWith('prisma+postgres://')) {
    return new PrismaClient({ accelerateUrl })
  }

  if (connectionString) {
    const adapter = new PrismaPg({ connectionString })
    return new PrismaClient({ adapter })
  }

  throw new Error('Set POSTGRES_PRISMA_URL (Accelerate) or POSTGRES_URL_NON_POOLING/POSTGRES_URL/DATABASE_URL')
}

let _client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (_client) return _client
  _client = globalForPrisma.prisma ?? createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _client
  }
  return _client
}

// Proxy による遅延初期化：モジュール読み込み時ではなく初回DB操作時に接続を確立する
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
