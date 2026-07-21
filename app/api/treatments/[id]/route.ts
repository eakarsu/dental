import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const treatmentUpdateSchema = z.object({
  patientId: z.string().optional(),
  dentistId: z.string().optional(),
  treatmentCode: z.string().optional(),
  treatmentName: z.string().optional(),
  description: z.string().optional().nullable(),
  toothNumber: z.string().optional().nullable(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  estimatedCost: z.number().optional(),
  actualCost: z.number().optional().nullable(),
  startDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  completionDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const treatment = await prisma.treatment.findFirst({
      where: { id, patient: { clinicId: session.user.clinicId } },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
          },
        },
      },
    })

    if (!treatment) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 })
    }

    return NextResponse.json(treatment)
  } catch (error) {
    console.error('Error fetching treatment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = treatmentUpdateSchema.parse(body)

    const existing = await prisma.treatment.findFirst({ where: { id, patient: { clinicId: session.user.clinicId } }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Treatment not found' }, { status: 404 })
    const treatment = await prisma.treatment.update({
      where: { id: existing.id },
      data: validatedData,
      include: {
        patient: true,
        dentist: true,
      },
    })

    return NextResponse.json(treatment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating treatment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
