import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  patientName: z.string(),
  claimNumber: z.string(),
  treatmentCode: z.string(),
  treatmentName: z.string(),
  denialReason: z.string(),
  claimedAmount: z.number(),
  insuranceProvider: z.string(),
  dateOfService: z.string(),
  clinicalJustification: z.string().optional(),
  additionalNotes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    const prompt = `Generate a professional insurance claim appeal letter for a denied dental claim with the following details:

**Claim Information:**
- Patient Name: ${data.patientName}
- Claim Number: ${data.claimNumber}
- Insurance Provider: ${data.insuranceProvider}
- Date of Service: ${data.dateOfService}

**Treatment Information:**
- Treatment Code: ${data.treatmentCode}
- Treatment Name: ${data.treatmentName}
- Claimed Amount: $${data.claimedAmount.toFixed(2)}

**Denial Information:**
- Reason for Denial: ${data.denialReason}

${data.clinicalJustification ? `**Clinical Justification:**\n${data.clinicalJustification}` : ''}
${data.additionalNotes ? `**Additional Notes:**\n${data.additionalNotes}` : ''}

Create a formal, professional appeal letter that includes:

1. **Formal Header** with date and insurance company address format
2. **RE: Line** with claim number and patient name
3. **Introduction** - Brief statement of purpose (appealing denial)
4. **Summary of Services** - Clear description of treatment provided
5. **Medical Necessity Justification** - Strong clinical arguments for why the treatment was necessary, including:
   - Clinical indications
   - Standard of care references
   - Potential consequences if treatment was not provided
   - How it prevented future complications
6. **Rebuttal to Denial Reason** - Specific counter-arguments to the stated denial reason
7. **Supporting Documentation** - List of enclosed documents (clinical notes, X-rays, etc.)
8. **Request for Reconsideration** - Clear ask for claim approval
9. **Professional Closing** - Thank you and contact information

The letter should be:
- Formal and professional in tone
- Evidence-based with clinical reasoning
- Persuasive but respectful
- Well-structured with clear sections
- Reference ADA guidelines or dental standards where applicable

Format it as a complete letter ready to be sent.`

    const response = await callOpenRouter([
      { role: 'system', content: 'You are an experienced dental office manager skilled in writing successful insurance appeal letters. Create professional, persuasive appeal letters with strong clinical justification.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.4, max_tokens: 2500 })

    return NextResponse.json({
      appealLetter: response,
      claimNumber: data.claimNumber,
      patientName: data.patientName,
      generatedDate: new Date().toISOString()
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error generating appeal letter:', error)
    return NextResponse.json(
      { error: 'Failed to generate appeal letter' },
      { status: 500 }
    )
  }
}
