import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

type AppointmentWithPatientHistory = Prisma.AppointmentGetPayload<{
  include: { patient: { include: { appointments: true } } }
}>

const requestSchema = z.object({
  appointmentId: z.string().optional(),
  patientId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    let appointments: AppointmentWithPatientHistory[] = []

    if (data.appointmentId) {
      // Predict for a specific appointment
      const appointment = await prisma.appointment.findFirst({
        where: { id: data.appointmentId, patient: { clinicId: session.user.clinicId } },
        include: {
          patient: {
            include: {
              appointments: {
                orderBy: { startTime: 'desc' },
                take: 20
              }
            }
          }
        }
      })
      if (appointment) {
        appointments = [appointment]
      }
    } else if (data.patientId) {
      // Predict for all upcoming appointments for a patient
      appointments = await prisma.appointment.findMany({
        where: {
          patientId: data.patientId,
          patient: { clinicId: session.user.clinicId },
          startTime: { gte: new Date() }
        },
        include: {
          patient: {
            include: {
              appointments: {
                orderBy: { startTime: 'desc' },
                take: 20
              }
            }
          }
        }
      })
    } else {
      // Predict for all upcoming appointments
      appointments = await prisma.appointment.findMany({
        where: {
          patient: { clinicId: session.user.clinicId },
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        include: {
          patient: {
            include: {
              appointments: {
                orderBy: { startTime: 'desc' },
                take: 20
              }
            }
          }
        },
        take: 50
      })
    }

    const predictions = await Promise.all(appointments.map(async (apt) => {
      const patient = apt.patient
      const history = patient.appointments

      // Calculate statistics
      const totalAppointments = history.length
      const cancelledOrNoShow = history.filter(a =>
        a.status === 'CANCELLED' || a.status === 'NO_SHOW'
      ).length
      const noShowRate = totalAppointments > 0 ? (cancelledOrNoShow / totalAppointments * 100).toFixed(1) : '0'

      const lastAppointmentStatus = history[0]?.status || 'N/A'
      const dayOfWeek = new Date(apt.startTime).toLocaleDateString('en-US', { weekday: 'long' })
      const timeOfDay = new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const daysUntilAppointment = Math.ceil((new Date(apt.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      const prompt = `You are a predictive analytics AI for a dental practice. Predict the likelihood of a patient not showing up for their appointment.

**Patient History:**
- Total Appointments: ${totalAppointments}
- Cancelled/No-Show Rate: ${noShowRate}%
- Last Appointment Status: ${lastAppointmentStatus}
- Appointment History Pattern: ${history.slice(0, 5).map(h => h.status).join(', ')}

**Upcoming Appointment Details:**
- Type: ${apt.type}
- Day: ${dayOfWeek}
- Time: ${timeOfDay}
- Days Until Appointment: ${daysUntilAppointment}
- Patient Phone: ${patient.phone ? 'Yes' : 'No'}
- Patient Email: ${patient.email ? 'Yes' : 'No'}

**Instructions:**
Analyze the data and predict no-show risk. Return JSON in this exact format:
{
  "riskLevel": "low" | "medium" | "high",
  "probability": 15.5,
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["action1", "action2"],
  "confidenceScore": 85
}

Consider:
1. Historical no-show/cancellation rate
2. Recency of last missed appointment
3. Day of week and time patterns
4. Days until appointment (closer = lower risk usually)
5. Contact information availability

Return ONLY valid JSON.`

      const response = await callOpenRouter([
        { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are a predictive analytics AI specializing in patient behavior patterns.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.2, max_tokens: 800 })

      const parseResult = extractAndParseJSON(response, `[predict-no-show][apt:${apt.id}]`)

      if (parseResult.success) {
        return {
          appointmentId: apt.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentDate: apt.startTime,
          appointmentType: apt.type,
          ...parseResult.data
        }
      }

      console.error(`[predict-no-show] Failed to parse prediction for appointment ${apt.id}:`, parseResult.error)
      return null
    }))

    return NextResponse.json({
      predictions: predictions.filter(p => p !== null),
      totalAnalyzed: appointments.length,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error predicting no-shows:', error)
    return NextResponse.json(
      { error: 'Failed to predict no-shows' },
      { status: 500 }
    )
  }
}
