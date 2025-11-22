import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  months: z.number().min(1).max(12).optional().default(3),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[Revenue Forecast] API endpoint called')
    const session = await auth()
    if (!session) {
      console.error('[Revenue Forecast] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Revenue Forecast] Request body:', body)
    const data = requestSchema.parse(body)
    console.log('[Revenue Forecast] Validated data:', data)

    // Fetch historical data
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [treatments, appointments, claims] = await Promise.all([
      prisma.treatment.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          estimatedCost: true,
          actualCost: true,
          status: true,
          createdAt: true,
        }
      }),
      prisma.appointment.findMany({
        where: {
          startTime: { gte: sixMonthsAgo }
        },
        select: {
          status: true,
          startTime: true,
          type: true,
        }
      }),
      prisma.insuranceClaim.findMany({
        where: {
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          claimedAmount: true,
          approvedAmount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
        }
      })
    ])

    // Calculate monthly revenue for last 6 months
    const monthlyRevenue = new Map<string, number>()
    treatments.forEach(t => {
      const month = new Date(t.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
      const revenue = Number(t.actualCost || t.estimatedCost || 0)
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + revenue)
    })

    claims.forEach(c => {
      const month = new Date(c.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
      const revenue = Number(c.paidAmount || 0)
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + revenue)
    })

    const revenueData = Array.from(monthlyRevenue.entries()).map(([month, amount]) => ({
      month,
      revenue: amount
    }))

    // Calculate statistics
    const totalTreatments = treatments.length
    const completedTreatments = treatments.filter(t => t.status === 'COMPLETED').length
    const averageTreatmentCost = treatments.reduce((sum, t) => sum + Number(t.actualCost || t.estimatedCost || 0), 0) / (treatments.length || 1)

    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length
    const appointmentCompletionRate = (completedAppointments / (totalAppointments || 1) * 100).toFixed(1)

    const totalClaimsPaid = claims.reduce((sum, c) => sum + Number(c.paidAmount || 0), 0)
    const averageClaimPayment = totalClaimsPaid / (claims.length || 1)

    // Get upcoming scheduled treatments
    const upcomingTreatments = await prisma.treatment.findMany({
      where: {
        status: { in: ['PLANNED', 'IN_PROGRESS'] }
      },
      select: {
        estimatedCost: true,
      }
    })

    const scheduledRevenue = upcomingTreatments.reduce((sum, t) => sum + Number(t.estimatedCost || 0), 0)

    const prompt = `You are a financial analytics AI for a dental practice. Forecast revenue for the next ${data.months} months based on historical data.

**Historical Monthly Revenue (Last 6 Months):**
${revenueData.map(d => `- ${d.month}: $${d.revenue.toFixed(2)}`).join('\n')}

**Practice Statistics:**
- Total Treatments (Last 6 months): ${totalTreatments}
- Completed Treatments: ${completedTreatments}
- Average Treatment Cost: $${averageTreatmentCost.toFixed(2)}
- Appointment Completion Rate: ${appointmentCompletionRate}%
- Average Insurance Claim Payment: $${averageClaimPayment.toFixed(2)}
- Currently Scheduled Revenue: $${scheduledRevenue.toFixed(2)}

**Current Date:** ${new Date().toLocaleDateString()}

**Instructions:**
Analyze the trends and forecast revenue. Return JSON in this exact format:
{
  "forecast": [
    {
      "month": "Dec 2025",
      "projectedRevenue": 45000.00,
      "confidence": "high",
      "factors": ["reason1", "reason2"]
    }
  ],
  "summary": {
    "totalProjected": 135000.00,
    "growthRate": 5.2,
    "trend": "increasing" | "stable" | "decreasing",
    "confidence": "high" | "medium" | "low"
  },
  "insights": ["insight1", "insight2"],
  "recommendations": ["action1", "action2"],
  "risks": ["risk1", "risk2"]
}

Consider:
1. Historical revenue trends (growth/decline patterns)
2. Seasonal variations (if observable)
3. Appointment completion rates
4. Scheduled treatments pipeline
5. Claims payment patterns
6. Month-over-month changes

Provide realistic forecasts. Be data-driven but account for uncertainty.

Return ONLY valid JSON.`

    console.log('[revenue-forecast] Calling OpenRouter API...')
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are a financial analytics AI specializing in healthcare practice revenue forecasting.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 2000 })

    const parseResult = extractAndParseJSON(response, '[revenue-forecast]')

    if (parseResult.success) {
      console.log('[revenue-forecast] Successfully parsed forecast')
      return NextResponse.json({
        ...parseResult.data,
        historicalData: revenueData,
        statistics: {
          totalTreatments,
          completedTreatments,
          averageTreatmentCost,
          appointmentCompletionRate: parseFloat(appointmentCompletionRate),
          scheduledRevenue
        },
        generatedAt: new Date().toISOString()
      })
    }

    console.error('[revenue-forecast] Failed to parse AI response:', parseResult.error)
    return NextResponse.json({
      error: 'Failed to parse AI response',
      details: parseResult.error
    }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Revenue Forecast] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[Revenue Forecast] Error generating revenue forecast:', error)
    console.error('[Revenue Forecast] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate revenue forecast', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
