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

export async function POST(request: NextRequest) {
  try {
    console.log('[Payment Plan] API endpoint called')
    const session = await auth()
    if (!session) {
      console.error('[Payment Plan] Unauthorized - no session')
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
` : '- No previous history'}

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

    console.log('[Payment Plan] Calling OpenRouter API...')
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. Ensure all JSON syntax is correct: commas between array elements, proper quote marks, balanced brackets.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 2000 })

    console.log('[Payment Plan] OpenRouter response received (length:', response.length, ')' )

    // Try multiple extraction strategies
    let jsonString = null

    // Strategy 1: Look for code blocks first
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      console.log('[Payment Plan] Found JSON in code block')
      jsonString = codeBlockMatch[1]
    }

    // Strategy 2: Try to find JSON object by counting braces
    if (!jsonString) {
      const firstBrace = response.indexOf('{')
      if (firstBrace !== -1) {
        let braceCount = 0
        let inString = false
        let escapeNext = false

        for (let i = firstBrace; i < response.length; i++) {
          const char = response[i]

          if (escapeNext) {
            escapeNext = false
            continue
          }

          if (char === '\\') {
            escapeNext = true
            continue
          }

          if (char === '"') {
            inString = !inString
            continue
          }

          if (!inString) {
            if (char === '{') braceCount++
            if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                jsonString = response.substring(firstBrace, i + 1)
                console.log('[Payment Plan] Extracted JSON by brace matching, length:', jsonString.length)
                break
              }
            }
          }
        }
      }
    }

    // Strategy 3: Fallback to greedy match
    if (!jsonString) {
      const greedyMatch = response.match(/\{[\s\S]*\}/)
      if (greedyMatch) {
        console.log('[Payment Plan] Using greedy match as fallback')
        jsonString = greedyMatch[0]
      }
    }

    if (jsonString) {
      console.log('[Payment Plan] Attempting to parse JSON, length:', jsonString.length)

      // Try to parse as-is first
      try {
        const recommendations = JSON.parse(jsonString)
        console.log('[Payment Plan] Recommendations parsed with', recommendations.plans?.length || 0, 'plans')
        return NextResponse.json({
          ...recommendations,
          patientName: data.patientName,
          totalAmount: data.totalAmount,
          generatedAt: new Date().toISOString()
        })
      } catch (parseError) {
        console.error('[Payment Plan] Initial JSON parse failed:', parseError instanceof Error ? parseError.message : 'Unknown parse error')
        console.error('[Payment Plan] Failed JSON string (first 1000 chars):', jsonString.substring(0, 1000))

        // Try to fix common JSON errors
        console.log('[Payment Plan] Attempting to fix common JSON errors...')
        let fixedJson = jsonString
          // Remove trailing commas before closing brackets/braces
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix missing commas between array elements (common AI error)
          .replace(/"\s*\n\s*"/g, '",\n"')
          // Fix missing commas after closing braces in arrays
          .replace(/}\s*\n\s*{/g, '},\n{')
          // Remove any markdown formatting
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')

        console.log('[Payment Plan] Trying to parse fixed JSON...')
        try {
          const recommendations = JSON.parse(fixedJson)
          console.log('[Payment Plan] Successfully parsed fixed JSON with', recommendations.plans?.length || 0, 'plans')
          return NextResponse.json({
            ...recommendations,
            patientName: data.patientName,
            totalAmount: data.totalAmount,
            generatedAt: new Date().toISOString()
          })
        } catch (secondError) {
          console.error('[Payment Plan] Fixed JSON also failed to parse:', secondError instanceof Error ? secondError.message : 'Unknown error')
          console.error('[Payment Plan] Fixed JSON (first 1000 chars):', fixedJson.substring(0, 1000))
          return NextResponse.json({
            error: 'Failed to parse AI response',
            details: parseError instanceof Error ? parseError.message : 'Invalid JSON format'
          }, { status: 500 })
        }
      }
    }

    console.error('[Payment Plan] Failed to extract JSON from response')
    return NextResponse.json({ error: 'Failed to extract JSON from AI response' }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Payment Plan] Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('[Payment Plan] Error generating payment plan recommendations:', error)
    console.error('[Payment Plan] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate payment plan recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
