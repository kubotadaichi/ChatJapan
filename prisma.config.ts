import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

loadEnv({ path: '.env.local', override: false })
loadEnv({ path: '.env', override: false })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env['POSTGRES_URL_NON_POOLING'] ??
      process.env['POSTGRES_URL'] ??
      process.env['DATABASE_URL'] ??
      process.env['POSTGRES_PRISMA_URL'],
  },
})
