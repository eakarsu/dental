import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouter } from '@/lib/openrouter'
import { z } from 'zod'
import { auth } from '@/lib/auth'

const requestSchema = z.object({
  question: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  context: z.object({
    patientName: z.string().optional(),
    upcomingAppointment: z.string().optional(),
    recentTreatments: z.array(z.string()).optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const data = requestSchema.parse(body)

    // Build conversation context
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      {
        role: 'system',
        content: `You are a friendly, knowledgeable dental practice chatbot assistant. Your role is to help patients with:

1. **General Dental Questions** - Answer common questions about dental procedures, oral health, care instructions
2. **Appointment Information** - Help with scheduling, rescheduling, preparation
3. **Insurance & Billing** - Basic information about insurance coverage, payment options, costs
4. **Post-Treatment Care** - Provide care instructions and answer recovery questions
5. **Office Policies** - Hours, location, cancellation policies, etc.

**Guidelines:**
- Be warm, empathetic, and professional
- Use simple, patient-friendly language (no jargon)
- For medical advice or emergencies, recommend calling the office or seeing a dentist
- For specific appointment changes, direct them to call the office
- Provide evidence-based information
- If you don't know something, be honest and suggest they contact the office

${data.context?.patientName ? `**Patient Context:**\n- Patient Name: ${data.context.patientName}` : ''}
${data.context?.upcomingAppointment ? `- Upcoming Appointment: ${data.context.upcomingAppointment}` : ''}
${data.context?.recentTreatments?.length ? `- Recent Treatments: ${data.context.recentTreatments.join(', ')}` : ''}

**Limitations:**
- Cannot diagnose conditions
- Cannot prescribe medications
- Cannot access or modify patient records
- Cannot schedule appointments (can provide information on how to schedule)

Respond naturally and helpfully to the patient's question.`
      }
    ]

    // Add conversation history if provided
    if (data.conversationHistory && data.conversationHistory.length > 0) {
      messages.push(...data.conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })))
    }

    // Add the current question
    messages.push({
      role: 'user',
      content: data.question
    })

    console.log('[chatbot] Calling OpenRouter API...')
    let response: string
    try {
      response = await callOpenRouter(messages, {
        temperature: 0.7,
        max_tokens: 800
      })
    } catch (apiError) {
      console.error('[chatbot] OpenRouter API call failed:', apiError)
      return NextResponse.json({
        error: 'AI service temporarily unavailable',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 503 })
    }

    console.log('[chatbot] Received response, length:', response.length)

    if (!response || response.trim().length === 0) {
      console.error('[chatbot] Received empty response from OpenRouter')
      return NextResponse.json({
        error: 'AI service returned empty response',
        details: 'The AI model did not generate any content. Please try again.'
      }, { status: 500 })
    }

    // Check if response suggests calling the office for urgent matters
    const requiresOfficeContact = response.toLowerCase().includes('call the office') ||
                                   response.toLowerCase().includes('contact us') ||
                                   response.toLowerCase().includes('emergency')

    return NextResponse.json({
      answer: response,
      requiresOfficeContact,
      conversationId: data.conversationHistory ? 'existing' : 'new',
      timestamp: new Date().toISOString(),
      suggestedFollowUps: generateFollowUpQuestions(data.question)
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error in chatbot:', error)
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}

function generateFollowUpQuestions(question: string): string[] {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes('root canal') || lowerQuestion.includes('endodontic')) {
    return [
      'How much does a root canal cost?',
      'Is a root canal painful?',
      'How long does recovery take?'
    ]
  }

  if (lowerQuestion.includes('crown') || lowerQuestion.includes('cap')) {
    return [
      'How long do dental crowns last?',
      'What types of crowns are available?',
      'How do I care for my crown?'
    ]
  }

  if (lowerQuestion.includes('cleaning') || lowerQuestion.includes('hygiene')) {
    return [
      'How often should I get a cleaning?',
      'What happens during a cleaning?',
      'Is teeth cleaning covered by insurance?'
    ]
  }

  if (lowerQuestion.includes('appointment') || lowerQuestion.includes('schedule')) {
    return [
      'What are your office hours?',
      'How do I reschedule an appointment?',
      'What should I bring to my appointment?'
    ]
  }

  if (lowerQuestion.includes('insurance') || lowerQuestion.includes('cost')) {
    return [
      'What insurance do you accept?',
      'Do you offer payment plans?',
      'How much will my treatment cost?'
    ]
  }

  return [
    'What are your office hours?',
    'Do you accept my insurance?',
    'How do I schedule an appointment?'
  ]
}
