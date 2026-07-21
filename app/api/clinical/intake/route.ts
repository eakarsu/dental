import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditHash, digestRegulated, encryptRegulated } from '@/lib/regulated-data'
import { canRecordIntake, evaluateSafety, identityMatchKey } from '@/lib/clinical-policy'

const intakeSchema = z.object({
  fhirPatient: z.object({
    resourceType: z.literal('Patient'),
    id: z.string().min(1).max(128),
    meta: z.object({ versionId: z.string().max(128).optional() }).optional(),
    identifier: z.array(z.object({ system: z.string().url().optional(), value: z.string().min(1).max(256) })).min(1),
    name: z.array(z.object({ family: z.string().min(1).max(100), given: z.array(z.string().min(1).max(100)).min(1) })).min(1),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    telecom: z.array(z.object({ system: z.enum(['phone', 'email']), value: z.string().min(1).max(254) })).optional(),
  }),
  sourceSystem: z.string().min(1).max(200),
  consent: z.object({
    scope: z.literal('clinical-care'),
    source: z.string().min(1).max(200),
    effectiveAt: z.coerce.date(),
    expiresAt: z.coerce.date().optional(),
    provenance: z.record(z.string(), z.unknown()),
  }),
  clinicalContext: z.object({
    allergies: z.array(z.string().max(200)).optional(),
    conditions: z.array(z.string().max(200)).optional(),
    medications: z.array(z.string().max(200)).optional(),
  }),
  proposedTreatment: z.string().min(5).max(4000),
  proposedMedications: z.array(z.string().max(200)).max(30).optional(),
  evidence: z.array(z.object({ source: z.string().min(1), reference: z.string().min(1), retrievedAt: z.coerce.date() })).min(1).max(30),
  provenance: z.object({
    authoringSystem: z.string().min(1),
    model: z.string().optional(),
    modelVersion: z.string().optional(),
    generatedAt: z.coerce.date(),
  }),
})

async function appendAudit(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], input: {
  clinicId: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  retentionDays: number
}) {
  const previous = await tx.clinicalAuditEvent.findFirst({
    where: { clinicId: input.clinicId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { eventHash: true },
  })
  const createdAt = new Date()
  const retentionUntil = new Date(createdAt.getTime() + input.retentionDays * 86_400_000)
  const canonical = { ...input, createdAt: createdAt.toISOString(), retentionUntil: retentionUntil.toISOString() }
  await tx.clinicalAuditEvent.create({
    data: {
      clinicId: input.clinicId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: input.metadata as never,
      previousHash: previous?.eventHash,
      eventHash: auditHash(previous?.eventHash ?? null, canonical),
      retentionUntil,
      createdAt,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canRecordIntake(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = intakeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid intake', details: parsed.error.flatten() }, { status: 400 })
  const input = parsed.data
  if (input.consent.expiresAt && input.consent.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Consent is already expired' }, { status: 422 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.findUniqueOrThrow({ where: { id: session.user.clinicId } })
      const identifier = input.fhirPatient.identifier[0].value
      const matchKey = identityMatchKey(identifier, input.fhirPatient.birthDate)
      const firstName = input.fhirPatient.name[0].given.join(' ')
      const lastName = input.fhirPatient.name[0].family
      const phone = input.fhirPatient.telecom?.find((item) => item.system === 'phone')?.value ?? 'not-provided'
      const email = input.fhirPatient.telecom?.find((item) => item.system === 'email')?.value

      const patient = await tx.patient.upsert({
        where: { clinicId_identityMatchKey: { clinicId: session.user.clinicId, identityMatchKey: matchKey } },
        update: { firstName, lastName, dateOfBirth: new Date(`${input.fhirPatient.birthDate}T00:00:00.000Z`), phone, email },
        create: {
          clinicId: session.user.clinicId,
          identityMatchKey: matchKey,
          firstName,
          lastName,
          dateOfBirth: new Date(`${input.fhirPatient.birthDate}T00:00:00.000Z`),
          phone,
          email,
          medicalHistory: input.clinicalContext as never,
        },
      })
      const consent = await tx.patientConsent.create({
        data: {
          clinicId: session.user.clinicId,
          patientId: patient.id,
          scope: input.consent.scope,
          source: input.consent.source,
          effectiveAt: input.consent.effectiveAt,
          expiresAt: input.consent.expiresAt,
          recordedById: session.user.id,
          provenanceJson: input.consent.provenance as never,
        },
      })
      const fhirImport = await tx.fhirImport.create({
        data: {
          clinicId: session.user.clinicId,
          patientId: patient.id,
          consentId: consent.id,
          resourceType: 'Patient',
          sourceSystem: input.sourceSystem,
          sourceResourceId: input.fhirPatient.id,
          sourceVersion: input.fhirPatient.meta?.versionId,
          payloadCiphertext: encryptRegulated(input.fhirPatient),
          payloadDigest: digestRegulated(input.fhirPatient),
          importedById: session.user.id,
        },
      })
      const safety = evaluateSafety({
        ...input.clinicalContext,
        proposedTreatment: input.proposedTreatment,
        proposedMedications: input.proposedMedications,
        hasVerifiedIdentity: Boolean(matchKey),
        hasActiveConsent: true,
      })
      const review = await tx.clinicalReview.create({
        data: {
          clinicId: session.user.clinicId,
          patientId: patient.id,
          fhirImportId: fhirImport.id,
          riskLevel: safety.riskLevel,
          recommendationCiphertext: encryptRegulated({ treatment: input.proposedTreatment, medications: input.proposedMedications ?? [] }),
          evidenceJson: input.evidence.map((item) => ({ ...item, retrievedAt: item.retrievedAt.toISOString() })) as never,
          contraindicationsJson: safety.contraindications,
          missingDataJson: safety.missingData,
          provenanceJson: { ...input.provenance, generatedAt: input.provenance.generatedAt.toISOString() } as never,
          escalationReason: safety.mustEscalate ? [...safety.contraindications, ...safety.missingData].join(' ') : null,
          createdById: session.user.id,
        },
      })
      await appendAudit(tx, {
        clinicId: session.user.clinicId,
        actorId: session.user.id,
        action: 'CLINICAL_INTAKE_CREATED',
        entityType: 'ClinicalReview',
        entityId: review.id,
        metadata: { patientId: patient.id, consentId: consent.id, fhirImportId: fhirImport.id, riskLevel: safety.riskLevel },
        retentionDays: clinic.retentionDays,
      })
      return { reviewId: review.id, patientId: patient.id, consentId: consent.id, riskLevel: safety.riskLevel, status: review.status, requiresEscalation: safety.mustEscalate }
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clinical intake failed'
    if (message.includes('Unique constraint')) return NextResponse.json({ error: 'This exact FHIR resource was already imported' }, { status: 409 })
    console.error('Clinical intake failed', error)
    return NextResponse.json({ error: 'Clinical intake failed' }, { status: 500 })
  }
}
