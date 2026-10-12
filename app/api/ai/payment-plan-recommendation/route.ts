import { extractAndParseJSON } from '@/lib/json-parser'
import { withDentalAI } from '@/lib/dental-ai-runtime'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  totalAmount: z.number(),
  patientName: z.string(),
  patientHistory: z.object({
    previousPayments: z.array(z.object({
      amount: z.number(),
      onTime: z.boolean(),
    })).optional(),
    averageMonthlyPayment: z.number().optional(),
  }).optional(),
  urgency: z.enum(['immediate', 'soon', 'flexible']).optional(),
})

async function nativePOST(request: NextRequest) {
  try {

    const session = await auth()
    if (!session) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const history = data.patientHistory
    const previousPaymentHistory = history?.previousPayments || []
    const avgPayment = history?.averageMonthlyPayment || 0
    const onTimeRate = previousPaymentHistory.length > 0
      ? (previousPaymentHistory.filter(p => p.onTime).length / previousPaymentHistory.length * 100).toFixed(0)
      : 'N/A'

    const prompt = `You are a financial counselor for a dental practice. Recommend personalized payment plan options for a patient.

**Treatment Cost:** $${data.totalAmount.toFixed(2)}

**Patient Payment History:**
${previousPaymentHistory.length > 0 ? `
- Previous Payments: ${previousPaymentHistory.length}
- On-Time Rate: ${onTimeRate}%
- Average Monthly: $${avgPayment.toFixed(2)}
` : '- No verified payment history was supplied; do not infer prior payments'}

**Urgency:** ${data.urgency || 'flexible'}

Create 3 payment plan options. Return ONLY valid JSON with NO additional text.

Required JSON format (copy this structure exactly):
{
  "plans": [
    {
      "planName": "Quick Payoff Plan",
      "monthlyPayment": 250.00,
      "duration": 6,
      "totalWithInterest": 1500.00,
      "interestRate": 0,
      "downPayment": 0,
      "pros": ["No interest", "Quick payoff"],
      "cons": ["Higher monthly payment"],
      "recommended": true,
      "reasoning": "Best for patients with good payment history"
    }
  ],
  "financialGuidance": "Practical advice here",
  "alternativeOptions": ["Consider CareCredit", "Ask about payment assistance programs"]
}

CRITICAL:
- Return ONLY the JSON object
- Use proper JSON syntax with commas after EVERY array element except the last
- All strings must use double quotes
- All arrays must have commas between elements
- No trailing commas
- Ensure all brackets and braces are balanced`

    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. Ensure all JSON syntax is correct: commas between array elements, proper quote marks, balanced brackets.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 2000 })

    const parsed = extractAndParseJSON(response)
    if (!parsed.success) return NextResponse.json({ error: 'Incomplete payment-plan response' }, { status: 502 })
    return NextResponse.json({ ...parsed.data, patientName: data.patientName, totalAmount: data.totalAmount, generatedAt: new Date().toISOString() })

  } catch (error) {
    if (error instanceof z.ZodError) {

      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }


    return NextResponse.json(
      { error: 'Failed to generate payment plan recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const POST = withDentalAI('payment-plan-recommendation', nativePOST)
