import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditHash } from '@/lib/regulated-data'
import { authorizeDecision } from '@/lib/clinical-policy'

const schema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'ESCALATED']),
  rationale: z.string().min(10).max(4000),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid decision', details: parsed.error.flatten() }, { status: 400 })
  const { id } = await params

  const review = await prisma.clinicalReview.findFirst({ where: { id, clinicId: session.user.clinicId } })
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  const authorization = authorizeDecision({
    role: session.user.role,
    actorId: session.user.id,
    createdById: review.createdById,
    riskLevel: review.riskLevel,
    decision: parsed.data.decision,
  })
  if (!authorization.allowed) return NextResponse.json({ error: authorization.reason }, { status: 403 })

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const update = await tx.clinicalReview.updateMany({
        where: { id, clinicId: session.user.clinicId, status: 'PENDING_REVIEW' },
        data: {
          status: parsed.data.decision,
          escalationReason: parsed.data.decision === 'ESCALATED' ? parsed.data.rationale : review.escalationReason,
          decidedById: session.user.id,
          decidedAt: new Date(),
        },
      })
      if (update.count !== 1) throw new Error('REVIEW_ALREADY_DECIDED')
      const clinic = await tx.clinic.findUniqueOrThrow({ where: { id: session.user.clinicId } })
      const previous = await tx.clinicalAuditEvent.findFirst({ where: { clinicId: session.user.clinicId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
      const createdAt = new Date()
      const retentionUntil = new Date(createdAt.getTime() + clinic.retentionDays * 86_400_000)
      const event = { action: `CLINICAL_REVIEW_${parsed.data.decision}`, entityId: id, actorId: session.user.id, rationale: parsed.data.rationale, createdAt: createdAt.toISOString() }
      await tx.clinicalAuditEvent.create({ data: {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: event.action,
        entityType: 'ClinicalReview',
        entityId: id,
        metadataJson: { rationale: parsed.data.rationale },
        previousHash: previous?.eventHash,
        eventHash: auditHash(previous?.eventHash ?? null, event),
        retentionUntil,
        createdAt,
      } })
      return tx.clinicalReview.findUniqueOrThrow({ where: { id } })
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ id: updated.id, status: updated.status, decidedAt: updated.decidedAt })
  } catch (error) {
    if (error instanceof Error && error.message === 'REVIEW_ALREADY_DECIDED') return NextResponse.json({ error: 'Review already decided' }, { status: 409 })
    console.error('Clinical decision failed', error)
    return NextResponse.json({ error: 'Clinical decision failed' }, { status: 500 })
  }
}
