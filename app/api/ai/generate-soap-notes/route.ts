import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string(),
  treatmentType: z.string(),
  toothNumber: z.string().optional().nullable(),
  vitalSigns: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are a dental professional creating SOAP notes. Generate comprehensive SOAP notes for the following dental treatment.

**Patient Information:**
${data.subjective ? `Subjective: ${data.subjective}` : ''}
${data.vitalSigns ? `Vital Signs: ${data.vitalSigns}` : ''}

**Treatment Details:**
Treatment: ${data.treatmentType}
${data.toothNumber ? `Tooth Number: ${data.toothNumber}` : ''}
Objective Findings: ${data.objective}

**Instructions:**
Generate structured SOAP notes in the following format:

**S (Subjective):**
- Chief complaint
- Patient's description of symptoms
- History of present illness
- Relevant medical/dental history

**O (Objective):**
- Clinical examination findings
- Vital signs (if applicable)
- Radiographic findings
- Intraoral examination
- Tooth-specific findings

**A (Assessment):**
- Diagnosis
- Clinical impression
- Risk factors
- Prognosis

**P (Plan):**
- Treatment performed
- Materials used
- Medications prescribed
- Post-operative instructions
- Follow-up plan
- Patient education provided

Format the notes professionally and comprehensively. Be specific and detailed.`

    const response = await callOpenRouter([
      { role: 'system', content: 'You are an experienced dental professional skilled in clinical documentation. Generate thorough, professional SOAP notes.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.4, max_tokens: 2000 })

    return NextResponse.json({
      soapNotes: response,
      format: 'SOAP'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error generating SOAP notes:', error)
    return NextResponse.json(
      { error: 'Failed to generate SOAP notes' },
      { status: 500 }
    )
  }
}
