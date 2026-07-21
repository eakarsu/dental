import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { ClaimStatus } from '@prisma/client'

const claimSchema = z.object({
  patientId: z.string(),
  treatmentId: z.string().optional().nullable(),
  claimNumber: z.string(),
  insuranceProvider: z.string(),
  policyNumber: z.string(),
  status: z.nativeEnum(ClaimStatus).optional(),
  submittedDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  approvedDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  deniedDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  claimedAmount: z.number(),
  approvedAmount: z.number().optional().nullable(),
  paidAmount: z.number().optional().nullable(),
  denialReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  claimData: z.any().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')

    const where: any = { patient: { clinicId: session.user.clinicId } }
    if (patientId) where.patientId = patientId
    if (status) where.status = status

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            insuranceProvider: true,
            insurancePolicyNo: true,
          },
        },
        treatment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(claims)
  } catch (error) {
    console.error('Error fetching claims:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = claimSchema.parse(body)

    const patient = await prisma.patient.findFirst({ where: { id: validatedData.patientId, clinicId: session.user.clinicId }, select: { id: true } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const claim = await prisma.insuranceClaim.create({
      data: validatedData,
      include: {
        patient: true,
        treatment: true,
      },
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating claim:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
