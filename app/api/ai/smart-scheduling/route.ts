import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  treatmentType: z.string(),
  patientId: z.string(),
  dentistId: z.string().optional(),
  preferredDays: z.array(z.string()).optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    // Fetch patient history
    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, clinicId: session.user.clinicId },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: { dentist: true }
        }
      }
    })

    // Fetch upcoming appointments for all dentists
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        patient: { clinicId: session.user.clinicId },
        startTime: {
          gte: new Date()
        },
        ...(data.dentistId && { dentistId: data.dentistId })
      },
      include: { dentist: true },
      orderBy: { startTime: 'asc' },
      take: 50
    })

    // Calculate typical appointment duration for this treatment type
    const treatmentDurationMap: Record<string, number> = {
      'CHECKUP': 30,
      'CLEANING': 60,
      'FILLING': 60,
      'ROOT_CANAL': 90,
      'CROWN': 90,
      'EXTRACTION': 45,
      'CONSULTATION': 30,
      'EMERGENCY': 30
    }

    const estimatedDuration = treatmentDurationMap[data.treatmentType] || 60

    // Analyze patient's appointment history
    const patientHistory = patient?.appointments.map(apt => ({
      time: new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      day: new Date(apt.startTime).toLocaleDateString('en-US', { weekday: 'long' }),
      status: apt.status,
      dentist: apt.dentist ? `Dr. ${apt.dentist.firstName} ${apt.dentist.lastName}` : 'Unassigned'
    })) || []

    const prompt = `You are an AI scheduling assistant for a dental practice. Analyze the data and recommend optimal appointment times.

**Treatment Details:**
- Treatment Type: ${data.treatmentType}
- Estimated Duration: ${estimatedDuration} minutes
- Patient Preferences: ${data.preferredTimeOfDay || 'any'} time${data.preferredDays?.length ? `, ${data.preferredDays.join(', ')}` : ''}

**Patient Appointment History (Last 10):**
${patientHistory.length > 0 ? patientHistory.map((h, i) => `${i + 1}. ${h.day} at ${h.time} - ${h.status} with ${h.dentist}`).join('\n') : 'No previous appointments'}

**Current Schedule Load:**
- Next week has ${upcomingAppointments.filter(a => {
  const aptDate = new Date(a.startTime)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  return aptDate < nextWeek
}).length} appointments booked

**Instructions:**
Based on the data, provide JSON recommendations with this structure:
{
  "recommendedSlots": [
    {
      "dayOfWeek": "Monday",
      "timeSlot": "9:00 AM",
      "date": "2025-12-01",
      "reason": "Why this slot is optimal",
      "priority": "high" | "medium" | "low"
    }
  ],
  "patternAnalysis": "Analysis of patient's scheduling patterns",
  "generalRecommendations": ["tip 1", "tip 2"]
}

Provide 3-5 recommended slots. Consider:
1. Patient's historical preferences
2. Treatment duration requirements
3. Current practice capacity
4. Time of day energy levels for this treatment type
5. Day of week patterns

Return ONLY valid JSON.`

    console.log('[smart-scheduling] Calling OpenRouter API...')
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are an intelligent scheduling AI that optimizes appointment times based on patient behavior patterns and practice efficiency.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 1500 })

    const parseResult = extractAndParseJSON(response, '[smart-scheduling]')

    if (parseResult.success) {
      console.log('[smart-scheduling] Successfully parsed recommendations')
      return NextResponse.json({
        ...parseResult.data,
        treatmentType: data.treatmentType,
        estimatedDuration,
      })
    }

    console.error('[smart-scheduling] Failed to parse AI response:', parseResult.error)
    return NextResponse.json({
      error: 'Failed to parse AI response',
      details: parseResult.error
    }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error generating scheduling recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate scheduling recommendations' },
      { status: 500 }
    )
  }
}
