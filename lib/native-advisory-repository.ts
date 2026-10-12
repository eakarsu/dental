import { prisma } from '@/lib/prisma'
import type { AdvisoryActor, AdvisoryRepository, SavedAdvisory } from './native-advisory-runtime'
type Row = { id: string; input: unknown; output: string; model: string; createdAt: Date }
const saved = (row: Row): SavedAdvisory => { const input = row.input as { prompt?: unknown }; return { id: row.id, prompt: typeof input?.prompt === 'string' ? input.prompt : '', content: row.output, model: row.model, createdAt: row.createdAt.toISOString(), canDelete: true } }
const owner = (actor: AdvisoryActor) => ({ userId: actor.id, clinicId: actor.scopeId!, feature: 'runtime-readiness' })
export const advisoryRepository: AdvisoryRepository = {
  async list(actor) { return (await prisma.aiRuntimeResult.findMany({ where: owner(actor), orderBy: { createdAt: 'desc' }, take: 50 })).map(saved) },
  async save(actor, input, signal) { return prisma.$transaction(async tx => { signal.throwIfAborted(); const row = await tx.aiRuntimeResult.create({ data: { ...owner(actor), input: { prompt: input.prompt }, output: input.content, model: input.model } }); signal.throwIfAborted(); return { ...saved(row), providerReceipt: input.providerReceipt } }) },
  async remove(actor, id, signal) { return prisma.$transaction(async tx => { signal.throwIfAborted(); const result = await tx.aiRuntimeResult.deleteMany({ where: { id, ...owner(actor) } }); signal.throwIfAborted(); return result.count === 1 }) },
}
