import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  dentalText: z.string(),
  includeDiagrams: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are a patient education specialist. Translate the following dental/medical terminology into simple, patient-friendly language:

**Dental Text:**
${data.dentalText}

**Instructions:**
1. Rewrite the text using simple, everyday language
2. Replace dental jargon with clear explanations
3. Use analogies when helpful (e.g., "like a cap on a tooth" for crown)
4. Maintain accuracy while being accessible
5. Keep the same general structure and flow
6. Add brief explanations in parentheses for necessary technical terms
7. Use a warm, reassuring tone

${data.includeDiagrams ? '8. Suggest simple text-based diagrams or descriptions where visual aids would help' : ''}

**Example:**
Technical: "The patient requires endodontic therapy on tooth #14 due to irreversible pulpitis"
Patient-Friendly: "We need to perform a root canal on your upper right first molar (back tooth). This is because the nerve inside the tooth is infected and can't heal on its own."

Now translate the provided text:`

    const response = await callOpenRouter([
      { role: 'system', content: 'You are a compassionate dentist skilled at explaining complex dental procedures to patients in simple, clear language. Your goal is to inform and reassure, not intimidate.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.5, max_tokens: 1500 })

    return NextResponse.json({
      originalText: data.dentalText,
      patientFriendlyText: response,
      translatedAt: new Date().toISOString()
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error translating jargon:', error)
    return NextResponse.json(
      { error: 'Failed to translate jargon' },
      { status: 500 }
    )
  }
}
