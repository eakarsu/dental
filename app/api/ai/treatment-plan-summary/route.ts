import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  treatments: z.array(z.object({
    treatmentCode: z.string(),
    treatmentName: z.string(),
    toothNumber: z.string().optional().nullable(),
    estimatedCost: z.number(),
    description: z.string().optional(),
  })),
  patientName: z.string(),
  totalCost: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[Treatment Plan Summary] API endpoint called')
    const session = await auth()
    if (!session) {
      console.error('[Treatment Plan Summary] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Treatment Plan Summary] Request body:', body)
    const data = requestSchema.parse(body)
    console.log('[Treatment Plan Summary] Validated data:', data)

    const treatmentList = data.treatments.map((t, i) =>
      `${i + 1}. ${t.treatmentName} (${t.treatmentCode})${t.toothNumber ? ` - Tooth #${t.toothNumber}` : ''}\n   Cost: $${t.estimatedCost.toFixed(2)}${t.description ? `\n   Notes: ${t.description}` : ''}`
    ).join('\n\n')

    const prompt = `You are creating a patient-friendly treatment plan summary for ${data.patientName}. The dentist has recommended the following treatments:

${treatmentList}

**Total Estimated Cost:** $${data.totalCost.toFixed(2)}

Generate a comprehensive yet easy-to-understand treatment plan summary that includes:

1. **Overview**: Brief introduction explaining the overall dental health situation
2. **Recommended Treatments**: For each treatment, explain:
   - What it is in simple terms (avoid dental jargon)
   - Why it's needed
   - What to expect during the procedure
   - Benefits of completing the treatment
3. **Treatment Timeline**: Suggested order and timing
4. **Cost Breakdown**: Clear explanation of costs
5. **Insurance Considerations**: General notes about insurance coverage
6. **Payment Options**: Mention that payment plans may be available
7. **What Happens If Delayed**: Brief explanation of risks if treatment is postponed
8. **Next Steps**: Clear action items for the patient

Write in a warm, reassuring, professional tone. Use simple language that a patient without medical knowledge can understand. Avoid technical jargon or explain it when necessary.`

    console.log('[Treatment Plan Summary] Calling OpenRouter API...')
    let response: string
    try {
      response = await callOpenRouter([
        { role: 'system', content: 'You are a compassionate dental professional creating patient education materials. Use clear, simple language to help patients understand their treatment plans.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.6, max_tokens: 2500 })
    } catch (apiError) {
      console.error('[Treatment Plan Summary] OpenRouter API call failed:', apiError)
      return NextResponse.json({
        error: 'AI service temporarily unavailable',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 503 })
    }

    console.log('[Treatment Plan Summary] OpenRouter response received (length:', response.length, ')')

    if (!response || response.trim().length === 0) {
      console.error('[Treatment Plan Summary] Received empty response from OpenRouter')
      return NextResponse.json({
        error: 'AI service returned empty response',
        details: 'The AI model did not generate any content. Please try again.'
      }, { status: 500 })
    }

    console.log('[Treatment Plan Summary] First 300 chars:', response.substring(0, 300))

    return NextResponse.json({
      summary: response,
      patientName: data.patientName,
      totalCost: data.totalCost,
      treatmentCount: data.treatments.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Treatment Plan Summary] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[Treatment Plan Summary] Error generating treatment plan summary:', error)
    console.error('[Treatment Plan Summary] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate treatment plan summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
