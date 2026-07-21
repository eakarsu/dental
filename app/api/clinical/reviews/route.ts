import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canReadClinicalData } from '@/lib/clinical-policy'
import { decryptRegulated } from '@/lib/regulated-data'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.clinicalReview.findMany({
    where: { clinicId: session.user.clinicId },
    include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const clinical = canReadClinicalData(session.user.role)
  return NextResponse.json(rows.map((row) => ({
    id: row.id,
    patient: clinical ? row.patient : { id: row.patient.id, firstName: 'Restricted', lastName: 'Patient' },
    status: row.status,
    riskLevel: row.riskLevel,
    recommendation: clinical ? decryptRegulated(row.recommendationCiphertext) : undefined,
    contraindications: clinical ? row.contraindicationsJson : undefined,
    missingData: clinical ? row.missingDataJson : undefined,
    evidence: clinical ? row.evidenceJson : undefined,
    provenance: clinical ? row.provenanceJson : undefined,
    escalationReason: clinical ? row.escalationReason : undefined,
    createdById: row.createdById,
    decidedById: row.decidedById,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
  })))
}
