import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const updated = await prisma.message.updateMany({
    where: { id, recipientId: session.user.id, sender: { clinicId: session.user.clinicId } },
    data: { isRead: true },
  })
  if (updated.count !== 1) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  return NextResponse.json({ id, isRead: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const deleted = await prisma.message.deleteMany({ where: { id, recipientId: session.user.id, sender: { clinicId: session.user.clinicId } } })
  if (deleted.count !== 1) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
