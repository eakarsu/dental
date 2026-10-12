import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAdvisoryHandlers } from '@/lib/native-advisory-runtime'
import { advisoryRepository } from '@/lib/native-advisory-repository'
const handlers = createAdvisoryHandlers({
  async authenticate() { const session = await auth(); if (!session?.user?.id || !session.user.clinicId) return null; const user = await prisma.user.findFirst({ where: { id: session.user.id, clinicId: session.user.clinicId, isActive: true }, select: { id: true, clinicId: true, role: true } }); return user ? { id: user.id, scopeId: user.clinicId, role: user.role } : null },
  repository: advisoryRepository, maxPrompt: 8000,
  systemPrompt: 'You are a dental-clinic operations reviewer, not a diagnostic system. Return operational risks, evidence gaps, next actions, uncertainty, and required licensed-clinician review.',
  reply: item => ({ id: item.id, response: item.content, model: item.model, provider: 'openrouter' }),
})
export const POST = handlers.POST
export const GET = handlers.GET
export const DELETE = handlers.DELETE
