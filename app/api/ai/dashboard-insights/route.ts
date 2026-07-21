import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Gather practice statistics
    const [
      totalPatients,
      totalAppointments,
      recentAppointments,
      totalTreatments,
      recentTreatments,
      totalClaims,
      recentClaims,
    ] = await Promise.all([
      prisma.patient.count({ where: { clinicId: session.user.clinicId } }),
      prisma.appointment.count({ where: { patient: { clinicId: session.user.clinicId } } }),
      prisma.appointment.findMany({
        where: { patient: { clinicId: session.user.clinicId } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { patient: true },
      }),
      prisma.treatment.count({ where: { patient: { clinicId: session.user.clinicId } } }),
      prisma.treatment.groupBy({
        by: ['status'],
        where: { patient: { clinicId: session.user.clinicId } },
        _count: true,
      }),
      prisma.insuranceClaim.count({ where: { patient: { clinicId: session.user.clinicId } } }),
      prisma.insuranceClaim.groupBy({
        by: ['status'],
        where: { patient: { clinicId: session.user.clinicId } },
        _count: true,
      }),
    ])

    // Calculate some metrics
    const appointmentsByStatus = recentAppointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const treatmentsByStatus = recentTreatments.reduce((acc, t) => {
      acc[t.status] = t._count
      return acc
    }, {} as Record<string, number>)

    const claimsByStatus = recentClaims.reduce((acc, c) => {
      acc[c.status] = c._count
      return acc
    }, {} as Record<string, number>)

    const prompt = `You are a dental practice analytics expert. Analyze the following practice data and provide 3-5 key insights and recommendations.

Practice Statistics:
- Total Patients: ${totalPatients}
- Total Appointments: ${totalAppointments}
- Recent Appointment Status: ${JSON.stringify(appointmentsByStatus)}
- Total Treatments: ${totalTreatments}
- Treatments by Status: ${JSON.stringify(treatmentsByStatus)}
- Total Insurance Claims: ${totalClaims}
- Claims by Status: ${JSON.stringify(claimsByStatus)}

Provide insights about:
1. Practice growth and patient engagement
2. Operational efficiency (appointment completion, treatment progress)
3. Revenue cycle (claims status, potential issues)
4. Actionable recommendations

Format your response as a JSON array of insights, each with:
{
  "title": "Brief insight title",
  "description": "Detailed explanation",
  "type": "positive" | "warning" | "info",
  "actionable": "What to do about it (if applicable)"
}

Return ONLY valid JSON, no additional text.`

    console.log('[dashboard-insights] Calling OpenRouter API...')
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are a dental practice analytics expert.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2 })

    const parseResult = extractAndParseJSON(response, '[dashboard-insights]')

    if (parseResult.success) {
      console.log('[dashboard-insights] Successfully parsed insights')
      return NextResponse.json({ insights: parseResult.data })
    }

    console.error('[dashboard-insights] Failed to parse AI response:', parseResult.error)
    return NextResponse.json({
      error: 'Failed to parse AI response',
      details: parseResult.error
    }, { status: 500 })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
