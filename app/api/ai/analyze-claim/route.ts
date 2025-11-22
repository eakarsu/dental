import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  treatmentCode: z.string(),
  treatmentName: z.string(),
  claimedAmount: z.number(),
  insuranceProvider: z.string(),
  patientAge: z.number().optional(),
  medicalNecessity: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[Analyze Claim] API endpoint called')
    const session = await auth()
    if (!session) {
      console.error('[Analyze Claim] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Analyze Claim] Request body:', body)
    const data = requestSchema.parse(body)
    console.log('[Analyze Claim] Validated data:', data)

    const prompt = `You are an expert in dental insurance claims processing. Analyze this claim and provide recommendations.

Claim Information:
- CDT Code: ${data.treatmentCode}
- Treatment: ${data.treatmentName}
- Claimed Amount: $${data.claimedAmount}
- Insurance Provider: ${data.insuranceProvider}
${data.patientAge ? `- Patient Age: ${data.patientAge}` : ''}
${data.medicalNecessity ? `- Medical Necessity Notes: ${data.medicalNecessity}` : ''}

Provide analysis in JSON format:
{
  "denialRisk": "low" | "medium" | "high",
  "riskFactors": ["factor 1", "factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "requiredDocumentation": ["doc 1", "doc 2"],
  "medicalNecessityStatement": "A professionally written statement justifying medical necessity",
  "estimatedApprovalAmount": number,
  "tips": ["tip 1", "tip 2"]
}

Respond with ONLY valid JSON.`

    console.log('[Analyze Claim] Calling OpenRouter API...')
    const response = await callOpenRouter([
      {
        role: 'system',
        content: 'You are an expert dental insurance claims analyst. Always respond with valid JSON.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.3 })

    console.log('[Analyze Claim] OpenRouter response received (length:', response.length, ')')
    console.log('[Analyze Claim] First 500 chars:', response.substring(0, 500))
    console.log('[Analyze Claim] Last 200 chars:', response.substring(Math.max(0, response.length - 200)))

    // Try multiple extraction strategies
    let jsonString = null

    // Strategy 1: Look for code blocks first
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      console.log('[Analyze Claim] Found JSON in code block')
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
                console.log('[Analyze Claim] Extracted JSON by brace matching, length:', jsonString.length)
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
        console.log('[Analyze Claim] Using greedy match as fallback')
        jsonString = greedyMatch[0]
      }
    }

    if (jsonString) {
      console.log('[Analyze Claim] Attempting to parse JSON, length:', jsonString.length)
      try {
        const analysis = JSON.parse(jsonString)
        console.log('[Analyze Claim] Analysis parsed successfully')
        return NextResponse.json(analysis)
      } catch (parseError) {
        console.error('[Analyze Claim] JSON parse error:', parseError instanceof Error ? parseError.message : 'Unknown parse error')
        console.error('[Analyze Claim] Failed JSON string (first 500 chars):', jsonString.substring(0, 500))
        return NextResponse.json({
          error: 'Failed to parse AI response',
          details: parseError instanceof Error ? parseError.message : 'Invalid JSON format'
        }, { status: 500 })
      }
    }

    console.error('[Analyze Claim] Failed to extract JSON from response')
    console.error('[Analyze Claim] Full response:', response)
    return NextResponse.json({ error: 'Failed to extract JSON from AI response' }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Analyze Claim] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[Analyze Claim] Error analyzing claim:', error)
    console.error('[Analyze Claim] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to analyze claim', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
