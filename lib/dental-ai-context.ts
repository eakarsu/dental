import { AsyncLocalStorage } from 'node:async_hooks'
export type DentalProviderReceipt = { id: string; model: string; created: number | null }
export type DentalAIContext = { signal: AbortSignal; receipts: DentalProviderReceipt[]; failure?: unknown; evidenceNote?: string; reviewFocus?: string }
export const dentalAIContext = new AsyncLocalStorage<DentalAIContext>()
export const dentalAIError = (message: string, status: number) => Object.assign(new Error(message), { status })
