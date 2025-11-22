import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { z } from 'zod'

const requestSchema = z.object({
  treatmentDescription: z.string(),
  toothNumber: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are a dental coding expert. Based on the following treatment description, suggest the most appropriate CDT (Current Dental Terminology) code(s).

Treatment Description: ${data.treatmentDescription}
${data.toothNumber ? `Tooth Number: ${data.toothNumber}` : ''}

Provide:
1. The most appropriate CDT code
2. The official code description
3. A brief explanation of why this code fits
4. Any alternative codes to consider

Format your response as JSON with this structure:
{
  "primaryCode": "D0150",
  "primaryDescription": "Comprehensive oral evaluation",
  "explanation": "...",
  "alternativeCodes": [
    {"code": "D0120", "description": "..."}
  ]
}`

    console.log('[suggest-cdt-code] Calling OpenRouter API...')
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are an expert in dental CDT coding.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2 })

    const parseResult = extractAndParseJSON(response, '[suggest-cdt-code]')

    if (parseResult.success) {
      console.log('[suggest-cdt-code] Successfully parsed suggestion')
      return NextResponse.json(parseResult.data)
    }

    console.error('[suggest-cdt-code] Failed to parse AI response:', parseResult.error)
    return NextResponse.json({
      error: 'Failed to parse AI response',
      details: parseResult.error
    }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[suggest-cdt-code] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[suggest-cdt-code] Error suggesting CDT code:', error)
    console.error('[suggest-cdt-code] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to suggest CDT code' },
      { status: 500 }
    )
  }
}
