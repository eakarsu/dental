import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { AppointmentStatus, AppointmentType } from '@prisma/client'

const appointmentSchema = z.object({
  patientId: z.string(),
  dentistId: z.string().optional().nullable(),
  type: z.nativeEnum(AppointmentType),
  status: z.nativeEnum(AppointmentStatus).optional(),
  startTime: z.string().transform((str) => new Date(str)),
  endTime: z.string().transform((str) => new Date(str)),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { patient: { clinicId: session.user.clinicId } }
    if (patientId) where.patientId = patientId
    if (dentistId) where.dentistId = dentistId
    if (status) where.status = status
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        dentist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
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
    const validatedData = appointmentSchema.parse(body)

    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: validatedData.patientId, clinicId: session.user.clinicId },
    })
    if (!patient) {
      return NextResponse.json(
        { error: `Patient with ID ${validatedData.patientId} not found` },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: validatedData,
      include: {
        patient: true,
        dentist: true,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
