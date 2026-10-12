import { NextResponse } from 'next/server'
import { demoLoginAvailable } from '@/lib/auth'

export async function GET() {
  return NextResponse.json(
    { available: demoLoginAvailable() },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
