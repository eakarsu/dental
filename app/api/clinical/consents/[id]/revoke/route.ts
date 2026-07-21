import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({ reason: z.string().min(5).max(1000) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid revocation' }, { status: 400 })
  const { id } = await params
  const result = await prisma.patientConsent.updateMany({
    where: { id, clinicId: session.user.clinicId, status: 'ACTIVE' },
    data: { status: 'REVOKED', revokedAt: new Date(), provenanceJson: { revokedBy: session.user.id, reason: parsed.data.reason } },
  })
  if (result.count !== 1) return NextResponse.json({ error: 'Active consent not found' }, { status: 404 })
  return NextResponse.json({ id, status: 'REVOKED' })
}
