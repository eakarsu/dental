import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.task.findFirst({ where: { id, clinicId: session.user.clinicId } });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if ('description' in body) data.description = body.description || null;
  if (body.status) data.status = body.status;
  if (body.priority) data.priority = body.priority;
  if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if ('assignedToId' in body) data.assignedToId = body.assignedToId || null;
  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json({ task });
}
