/** Parse genuine provider JSON without repairing or fabricating fields. */
export function extractAndParseJSON(response: string, _logPrefix?: string): { success: boolean; data?: any; error?: string } {
  const text = response.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim()
  try { const data = JSON.parse(text); if (!data || typeof data !== 'object') throw Error(); return { success: true, data } }
  catch { return { success: false, error: 'The provider did not return a complete structured response' } }
}
