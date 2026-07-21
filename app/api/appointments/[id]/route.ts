import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { AppointmentStatus, AppointmentType } from '@prisma/client'

const appointmentUpdateSchema = z.object({
  patientId: z.string().optional(),
  dentistId: z.string().optional().nullable(),
  type: z.nativeEnum(AppointmentType).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  startTime: z.string().transform((str) => new Date(str)).optional(),
  endTime: z.string().transform((str) => new Date(str)).optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
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

    const appointment = await prisma.appointment.findFirst({
      where: { id, patient: { clinicId: session.user.clinicId } },
      include: {
        patient: true,
        dentist: true,
        treatments: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const validatedData = appointmentUpdateSchema.parse(body)

    const existing = await prisma.appointment.findFirst({ where: { id, patient: { clinicId: session.user.clinicId } }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: validatedData,
      include: {
        patient: true,
        dentist: true,
      },
    })

    return NextResponse.json(appointment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const deleted = await prisma.appointment.deleteMany({ where: { id, patient: { clinicId: session.user.clinicId } } })
    if (deleted.count !== 1) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
