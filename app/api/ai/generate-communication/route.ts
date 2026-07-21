import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'

const requestSchema = z.object({
  type: z.enum(['appointment_reminder', 'post_treatment', 'payment_reminder', 'follow_up']),
  patientName: z.string(),
  appointmentDate: z.string().optional(),
  treatmentType: z.string().optional(),
  amount: z.number().optional(),
  instructions: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = requestSchema.parse(body)

    let prompt = ''

    switch (data.type) {
      case 'appointment_reminder':
        prompt = `Generate a friendly appointment reminder message for ${data.patientName}.
Appointment Date: ${data.appointmentDate}
${data.treatmentType ? `Treatment Type: ${data.treatmentType}` : ''}

The message should be warm, professional, and include:
- Friendly greeting
- Appointment details
- Reminder to arrive 10 minutes early
- Contact info if they need to reschedule
- Keep it under 160 characters for SMS`
        break

      case 'post_treatment':
        prompt = `Generate post-treatment care instructions for ${data.patientName}.
Treatment: ${data.treatmentType}
${data.instructions ? `Specific instructions: ${data.instructions}` : ''}

Include:
- What to expect (pain, swelling, etc.)
- Do's and don'ts
- When to call the office
- Medication reminders if applicable
Keep it clear and reassuring.`
        break

      case 'payment_reminder':
        prompt = `Generate a polite payment reminder for ${data.patientName}.
Outstanding Amount: $${data.amount}

The message should be:
- Empathetic and non-confrontational
- Professional
- Include payment options
- Offer to discuss payment plans if needed
Keep it respectful and understanding.`
        break

      case 'follow_up':
        prompt = `Generate a follow-up message for ${data.patientName}.
Previous Treatment: ${data.treatmentType}

The message should:
- Check on their recovery
- Ask if they have any concerns
- Remind them of next appointment if applicable
- Be warm and caring
Keep it personal and genuine.`
        break
    }

    const message = await callOpenRouter([
      { role: 'system', content: 'You are a compassionate dental office communication specialist.' },
      { role: 'user', content: prompt }
    ])

    return NextResponse.json({ generatedMessage: message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error generating communication:', error)
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    )
  }
}
