import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  treatmentType: z.string(),
  treatmentCode: z.string().optional(),
  toothNumber: z.string().optional().nullable(),
  description: z.string().optional(),
  patientAge: z.number().optional(),
  patientHistory: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are a professional dental assistant helping to generate clinical treatment notes.

Treatment Information:
- Treatment Type: ${data.treatmentType}
${data.treatmentCode ? `- CDT Code: ${data.treatmentCode}` : ''}
${data.toothNumber ? `- Tooth Number: ${data.toothNumber}` : ''}
${data.description ? `- Description: ${data.description}` : ''}
${data.patientAge ? `- Patient Age: ${data.patientAge}` : ''}
${data.patientHistory ? `- Relevant History: ${data.patientHistory}` : ''}

Generate comprehensive, professional clinical notes for this treatment. Include:
1. Chief complaint (if applicable)
2. Clinical findings
3. Procedure performed
4. Materials used (if applicable)
5. Patient tolerance
6. Post-operative instructions given
7. Follow-up recommendations

Format the notes professionally as they would appear in a dental record. Keep it concise but thorough.`

    const notes = await callOpenRouter([
      { role: 'system', content: 'You are an expert dental clinical documentation assistant.' },
      { role: 'user', content: prompt }
    ])

    return NextResponse.json({ generatedNotes: notes })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error generating notes:', error)
    return NextResponse.json(
      { error: 'Failed to generate notes' },
      { status: 500 }
    )
  }
}
