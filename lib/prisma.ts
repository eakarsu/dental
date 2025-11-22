import 'server-only'
import { PrismaClient } from '@prisma/client'

// This will be undefined on the client, which is fine
// The client should never directly use Prisma - it should go through API routes
declare const globalThis: {
  prismaGlobal: PrismaClient | undefined
} & typeof global

// Create a new Prisma client with appropriate adapter
// This only runs on the server (Node.js environment)
const createPrismaClient = () => {
  // Server-only code - check if we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('Prisma Client cannot be used in the browser')
  }

  // Check if using Neon serverless database
  const isNeonDb = process.env.DATABASE_URL?.includes('neon.tech') ||
                   process.env.DATABASE_URL?.includes('pooler')

  if (isNeonDb) {
    // Use Neon adapter for serverless PostgreSQL
    const { Pool } = require('@neondatabase/serverless')
    const { PrismaNeon } = require('@prisma/adapter-neon')

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaNeon(pool)

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // Use standard pg adapter for local/traditional PostgreSQL
  const { Pool } = require('pg')
  const { PrismaPg } = require('@prisma/adapter-pg')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Singleton pattern to prevent multiple instances
const prisma = globalThis.prismaGlobal ?? createPrismaClient()

// Save to global in development to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export { prisma }
