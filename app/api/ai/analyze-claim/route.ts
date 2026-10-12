import { extractAndParseJSON } from '@/lib/json-parser'
import { withDentalAI } from '@/lib/dental-ai-runtime'
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

async function nativePOST(request: NextRequest) {
  try {

    const session = await auth()
    if (!session) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

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

    const response = await callOpenRouter([
      {
        role: 'system',
        content: 'You are an expert dental insurance claims analyst. Always respond with valid JSON.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.3 })

    const parsed = extractAndParseJSON(response)
    if(!parsed.success)return NextResponse.json({error:'Incomplete claims response'},{status:502})
    return NextResponse.json(parsed.data)

  } catch (error) {
    if (error instanceof z.ZodError) {

      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }


    return NextResponse.json(
      { error: 'Failed to analyze claim', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const POST = withDentalAI('analyze-claim', nativePOST)
