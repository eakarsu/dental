import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { extractAndParseJSON } from '@/lib/json-parser'
import { z } from 'zod'

const requestSchema = z.object({
  patientAge: z.number(),
  medicalHistory: z.array(z.string()),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  plannedProcedure: z.string(),
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
  }).optional(),
  smokingStatus: z.enum(['never', 'former', 'current']).optional(),
  diabetic: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `You are a clinical risk assessment AI for dental procedures. Evaluate the patient's risk level for complications.

**Patient Information:**
- Age: ${data.patientAge}
- Medical History: ${data.medicalHistory.join(', ')}
${data.medications?.length ? `- Current Medications: ${data.medications.join(', ')}` : ''}
${data.allergies?.length ? `- Known Allergies: ${data.allergies.join(', ')}` : ''}
${data.vitalSigns?.bloodPressure ? `- Blood Pressure: ${data.vitalSigns.bloodPressure}` : ''}
${data.vitalSigns?.heartRate ? `- Heart Rate: ${data.vitalSigns.heartRate} bpm` : ''}
${data.smokingStatus ? `- Smoking Status: ${data.smokingStatus}` : ''}
${data.diabetic !== undefined ? `- Diabetic: ${data.diabetic ? 'Yes' : 'No'}` : ''}

**Planned Procedure:**
${data.plannedProcedure}

**Instructions:**
Perform a comprehensive risk assessment. Return JSON in this exact format:
{
  "overallRisk": "low" | "medium" | "high" | "very_high",
  "riskScore": 35,
  "riskCategories": {
    "anesthesia": { "level": "low", "score": 10 },
    "bleeding": { "level": "medium", "score": 40 },
    "infection": { "level": "low", "score": 20 },
    "cardiovascular": { "level": "medium", "score": 50 },
    "medication": { "level": "low", "score": 15 }
  },
  "specificRisks": [
    {
      "risk": "Risk name",
      "severity": "high",
      "likelihood": "moderate",
      "description": "Detailed explanation",
      "mitigation": "How to reduce this risk"
    }
  ],
  "precautions": ["precaution1", "precaution2"],
  "contraindications": [],
  "requiredConsultations": ["Cardiologist for clearance"],
  "procedureModifications": ["Consider local instead of general anesthesia"],
  "monitoringRecommendations": ["Check BP before and after"],
  "emergencyPreparedness": ["Have epinephrine available"],
  "patientCounseling": "What to discuss with patient regarding risks"
}

Consider:
1. **ASA Classification** (American Society of Anesthesiologists)
2. **Medication Interactions** - Especially anticoagulants, immunosuppressants
3. **Cardiovascular Risk** - HTN, heart disease, recent MI
4. **Diabetes Management** - Blood sugar control, healing concerns
5. **Bleeding Risk** - Medications, disorders
6. **Infection Risk** - Immunocompromised status
7. **Age-Related Factors**
8. **Allergies** - Cross-reactions with dental materials/medications

Be thorough, evidence-based, and err on the side of caution. Flag any high-risk factors prominently.

Return ONLY valid JSON.`

    console.log('[risk-assessment] Calling OpenRouter API...')
    let response: string
    try {
      response = await callOpenRouter([
        { role: 'system', content: 'You are a JSON-generating API. You MUST respond with ONLY valid, well-formed JSON. NO additional text, explanations, or markdown. You are a medical risk assessment AI with expertise in dental procedures.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.2, max_tokens: 2500 })
    } catch (apiError) {
      console.error('[risk-assessment] OpenRouter API call failed:', apiError)
      return NextResponse.json({
        error: 'AI service temporarily unavailable',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 503 })
    }

    console.log('[risk-assessment] Received response, length:', response.length)

    if (!response || response.trim().length === 0) {
      console.error('[risk-assessment] Received empty response from OpenRouter')
      return NextResponse.json({
        error: 'AI service returned empty response',
        details: 'The AI model did not generate any content. Please try again.'
      }, { status: 500 })
    }

    const parseResult = extractAndParseJSON(response, '[risk-assessment]')

    if (parseResult.success) {
      console.log('[risk-assessment] Successfully parsed assessment')
      return NextResponse.json({
        ...parseResult.data,
        patientAge: data.patientAge,
        procedure: data.plannedProcedure,
        assessmentDate: new Date().toISOString(),
        disclaimer: "This AI-generated risk assessment must be reviewed and validated by a licensed healthcare provider before making clinical decisions."
      })
    }

    console.error('[risk-assessment] Failed to parse AI response:', parseResult.error)
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
    console.error('Error generating risk assessment:', error)
    return NextResponse.json(
      { error: 'Failed to generate risk assessment' },
      { status: 500 }
    )
  }
}
