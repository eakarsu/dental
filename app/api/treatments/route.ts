import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { TreatmentStatus } from '@prisma/client'

const treatmentSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional().nullable(),
  dentistId: z.string(),
  treatmentCode: z.string(),
  treatmentName: z.string(),
  description: z.string().optional().nullable(),
  toothNumber: z.string().optional().nullable(),
  status: z.nativeEnum(TreatmentStatus).optional(),
  estimatedCost: z.number(),
  actualCost: z.number().optional().nullable(),
  startDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  completionDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  notes: z.string().optional().nullable(),
  checklist: z.any().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const dentistId = searchParams.get('dentistId')
    const status = searchParams.get('status')

    const where: any = {}
    if (patientId) where.patientId = patientId
    if (dentistId) where.dentistId = dentistId
    if (status) where.status = status

    const treatments = await prisma.treatment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(treatments)
  } catch (error) {
    console.error('Error fetching treatments:', error)
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
    const validatedData = treatmentSchema.parse(body)

    const treatment = await prisma.treatment.create({
      data: validatedData,
      include: {
        patient: true,
        dentist: true,
      },
    })

    return NextResponse.json(treatment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating treatment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
