import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)
    const startMonth = startOfMonth(today)
    const endMonth = endOfMonth(today)

    const [
      totalPatients,
      todayAppointments,
      pendingClaims,
      completedTreatments,
      upcomingAppointments,
      recentPatients,
    ] = await Promise.all([
      prisma.patient.count({ where: { isActive: true } }),
      prisma.appointment.count({
        where: {
          startTime: {
            gte: startToday,
            lte: endToday,
          },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
      prisma.insuranceClaim.count({
        where: {
          status: { in: ['SUBMITTED', 'PENDING'] },
        },
      }),
      prisma.treatment.findMany({
        where: {
          status: 'COMPLETED',
          completionDate: {
            gte: startMonth,
            lte: endMonth,
          },
        },
        select: {
          actualCost: true,
        },
      }),
      prisma.appointment.findMany({
        where: {
          startTime: {
            gte: today,
          },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        take: 5,
        orderBy: { startTime: 'asc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.patient.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      }),
    ])

    const monthlyRevenue = completedTreatments.reduce(
      (sum, t) => sum + Number(t.actualCost || 0),
      0
    )

    return NextResponse.json({
      totalPatients,
      todayAppointments,
      pendingClaims,
      monthlyRevenue,
      upcomingAppointments,
      recentPatients,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
