import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const messages = await prisma.message.findMany({
    where: { recipientId: session.user.id, sender: { clinicId: session.user.clinicId } },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ messages })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message', details: parsed.error.flatten() }, { status: 400 })
  const recipient = await prisma.user.findFirst({ where: { id: parsed.data.recipientId, clinicId: session.user.clinicId, isActive: true }, select: { id: true } })
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  const message = await prisma.message.create({ data: { senderId: session.user.id, ...parsed.data } })
  return NextResponse.json(message, { status: 201 })
}
