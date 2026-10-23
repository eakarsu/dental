import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { parseTaskInput } from '@/lib/tasks-export';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const where: Record<string, unknown> = { clinicId: session.user.clinicId };
  if (status) where.status = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };
  const tasks = await prisma.task.findMany({ where, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = parseTaskInput(await request.json());
    const task = await prisma.task.create({ data: { ...data, clinicId: session.user.clinicId } });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create task' }, { status: 400 });
  }
}
