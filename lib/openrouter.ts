export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
}

export async function callOpenRouter(messages: OpenRouterMessage[], options?: {
  model?: string
  temperature?: number
  max_tokens?: number
}) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.error('[OpenRouter] API key is not set')
    throw new Error('OPENROUTER_API_KEY is not set in environment variables')
  }

  // Use a more reliable model with fallback options
  const defaultModel = options?.model || process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free'

  const requestBody = {
    model: defaultModel,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 2000,
  }

  console.log('[OpenRouter] Making API request:', {
    model: requestBody.model,
    messageCount: messages.length,
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens,
  })

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Dental Clinic SaaS',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('[OpenRouter] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OpenRouter] API error response:', errorText)
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('[OpenRouter] Success, received response')
    console.log('[OpenRouter] Response data:', JSON.stringify(data, null, 2))

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[OpenRouter] Invalid response structure:', JSON.stringify(data, null, 2))
      throw new Error('Invalid response from OpenRouter API')
    }

    const content = data.choices[0].message.content

    if (!content || content.trim().length === 0) {
      console.error('[OpenRouter] Empty content in response')
      console.error('[OpenRouter] Full response:', JSON.stringify(data, null, 2))
      throw new Error('OpenRouter returned empty content')
    }

    console.log('[OpenRouter] Content length:', content.length)
    return content
  } catch (error) {
    console.error('[OpenRouter] Request failed:', error)
    throw error
  }
}
