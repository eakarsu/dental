/**
 * Robust JSON extraction and parsing utility for AI responses
 * Handles various edge cases like markdown code blocks, missing commas, trailing commas, etc.
 */

interface ParseResult {
  success: boolean
  data?: any
  error?: string
}

export function extractAndParseJSON(response: string, logPrefix: string = '[JSON Parser]'): ParseResult {
  console.log(`${logPrefix} Attempting to extract JSON from response (length: ${response.length})`)
  console.log(`${logPrefix} First 500 chars:`, response.substring(0, 500))
  console.log(`${logPrefix} Last 200 chars:`, response.substring(Math.max(0, response.length - 200)))

  let jsonString: string | null = null

  // Strategy 1: Look for JSON in markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    console.log(`${logPrefix} Found JSON in code block`)
    jsonString = codeBlockMatch[1]
  }

  // Strategy 2: Extract JSON by counting braces (handles nested objects and arrays)
  if (!jsonString) {
    const firstBrace = response.indexOf('{')
    if (firstBrace !== -1) {
      let braceCount = 0
      let inString = false
      let escapeNext = false

      for (let i = firstBrace; i < response.length; i++) {
        const char = response[i]

        if (escapeNext) {
          escapeNext = false
          continue
        }

        if (char === '\\') {
          escapeNext = true
          continue
        }

        if (char === '"') {
          inString = !inString
          continue
        }

        if (!inString) {
          if (char === '{') braceCount++
          if (char === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonString = response.substring(firstBrace, i + 1)
              console.log(`${logPrefix} Extracted JSON by brace matching, length: ${jsonString.length}`)
              break
            }
          }
        }
      }

      // If we didn't find a complete JSON object, log the issue
      if (braceCount !== 0) {
        console.error(`${logPrefix} Incomplete JSON - mismatched braces (braceCount: ${braceCount})`)
      }
    }
  }

  // Strategy 3: Fallback to greedy match
  if (!jsonString) {
    const greedyMatch = response.match(/\{[\s\S]*\}/)
    if (greedyMatch) {
      console.log(`${logPrefix} Using greedy match as fallback`)
      jsonString = greedyMatch[0]
    }
  }

  if (!jsonString) {
    console.error(`${logPrefix} No JSON found in response`)
    console.error(`${logPrefix} Full response:`, response)
    return {
      success: false,
      error: 'No JSON object found in AI response'
    }
  }

  console.log(`${logPrefix} Attempting to parse JSON, length: ${jsonString.length}`)

  // Try to parse as-is first
  try {
    const data = JSON.parse(jsonString)
    console.log(`${logPrefix} Successfully parsed JSON`)
    return { success: true, data }
  } catch (parseError) {
    console.error(`${logPrefix} Initial JSON parse failed:`, parseError instanceof Error ? parseError.message : 'Unknown error')
    console.error(`${logPrefix} Failed JSON string (first 1000 chars):`, jsonString.substring(0, 1000))

    // Try to fix common JSON errors
    console.log(`${logPrefix} Attempting to fix common JSON errors...`)
    let fixedJson = jsonString
      // Remove trailing commas before closing brackets/braces
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between array elements (strings)
      .replace(/"\s*\n\s*"/g, '",\n"')
      // Fix missing commas after closing braces in arrays
      .replace(/}\s*\n\s*{/g, '},\n{')
      // Remove any markdown formatting
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      // Fix unescaped newlines in strings
      .replace(/: "([^"]*)\n([^"]*)"(\s*[,}\]])/g, ': "$1\\n$2"$3')

    console.log(`${logPrefix} Trying to parse fixed JSON...`)
    console.log(`${logPrefix} Fixed JSON (first 500 chars):`, fixedJson.substring(0, 500))
    try {
      const data = JSON.parse(fixedJson)
      console.log(`${logPrefix} Successfully parsed fixed JSON`)
      return { success: true, data }
    } catch (secondError) {
      console.error(`${logPrefix} Fixed JSON also failed to parse:`, secondError instanceof Error ? secondError.message : 'Unknown error')
      console.error(`${logPrefix} Fixed JSON (first 1000 chars):`, fixedJson.substring(0, 1000))
      return {
        success: false,
        error: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}. Please check server logs for full response.`
      }
    }
  }
}
