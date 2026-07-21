import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { z } from 'zod'

const requestSchema = z.object({
  diagnosis: z.string(),
  toothNumber: z.string().optional().nullable(),
  symptoms: z.array(z.string()).optional(),
  patientAge: z.number().optional(),
  medicalHistory: z.array(z.string()).optional(),
  radiographicFindings: z.string().optional(),
  budget: z.enum(['low', 'medium', 'high', 'no_constraint']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are an experienced dental professional providing treatment recommendations. Based on the patient information, recommend appropriate treatment options.

**Clinical Information:**
- Diagnosis: ${data.diagnosis}
${data.toothNumber ? `- Tooth Number: ${data.toothNumber}` : ''}
${data.symptoms?.length ? `- Symptoms: ${data.symptoms.join(', ')}` : ''}
${data.patientAge ? `- Patient Age: ${data.patientAge}` : ''}
${data.medicalHistory?.length ? `- Medical History: ${data.medicalHistory.join(', ')}` : ''}
${data.radiographicFindings ? `- Radiographic Findings: ${data.radiographicFindings}` : ''}
${data.budget ? `- Budget Consideration: ${data.budget}` : ''}

**Instructions:**
Provide comprehensive treatment recommendations. Return JSON in this exact format:
{
  "recommendedTreatments": [
    {
      "treatmentName": "Root Canal Therapy",
      "cdtCode": "D3310",
      "priority": "urgent" | "high" | "medium" | "low",
      "estimatedCost": 1200.00,
      "duration": "90 minutes",
      "visits": 2,
      "description": "Detailed explanation of the procedure",
      "pros": ["benefit1", "benefit2"],
      "cons": ["limitation1"],
      "successRate": "95%",
      "recoveryTime": "3-5 days",
      "alternatives": ["alternative1"]
    }
  ],
  "treatmentSequence": ["Step 1", "Step 2"],
  "clinicalRationale": "Why these treatments are recommended",
  "contraindications": ["condition1"],
  "patientEducation": "What the patient should know",
  "followUpPlan": "Recommended follow-up schedule"
}

Consider:
1. Standard of care for the diagnosis
2. Patient's age and medical history
3. Cost-effectiveness
4. Long-term outcomes
5. Alternative treatment options
6. Urgency of treatment
7. Treatment sequencing

Provide 2-4 treatment options ranked by priority. Be thorough, evidence-based, and patient-centered.

Return ONLY valid JSON.`

    console.log('[treatment-recommendations] Calling OpenRouter API...')
    let response: string
    try {
      response = await callOpenRouter([
        { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are an experienced dental professional providing treatment recommendations.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.2, max_tokens: 2500 })
    } catch (apiError) {
      console.error('[treatment-recommendations] OpenRouter API call failed:', apiError)
      return NextResponse.json({
        error: 'AI service temporarily unavailable',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 503 })
    }

    console.log('[treatment-recommendations] Received response, length:', response.length)

    if (!response || response.trim().length === 0) {
      console.error('[treatment-recommendations] Received empty response from OpenRouter')
      return NextResponse.json({
        error: 'AI service returned empty response',
        details: 'The AI model did not generate any content. Please try again.'
      }, { status: 500 })
    }

    const parseResult = extractAndParseJSON(response, '[treatment-recommendations]')

    if (parseResult.success) {
      console.log('[treatment-recommendations] Successfully parsed recommendations')
      return NextResponse.json({
        ...parseResult.data,
        diagnosis: data.diagnosis,
        generatedAt: new Date().toISOString(),
        disclaimer: "These AI-generated recommendations should be reviewed by a licensed dentist before implementation."
      })
    }

    console.error('[treatment-recommendations] Failed to parse AI response:', parseResult.error)
    return NextResponse.json({
      error: 'Failed to parse AI response',
      details: parseResult.error
    }, { status: 500 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error generating treatment recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate treatment recommendations' },
      { status: 500 }
    )
  }
}
