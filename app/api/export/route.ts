import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redactPatient } from '@/lib/clinical-policy';
import { toCsv } from '@/lib/tasks-export';

const FIELDS = ['id', 'firstName', 'lastName', 'email', 'phone', 'createdAt'];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const search = searchParams.get('search') || '';
  const where: Record<string, unknown> = { clinicId: session.user.clinicId };
  if (search) where.OR = [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
  const patients = await prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, take: 1000 });
  const rows = patients.map((p) => redactPatient(p as unknown as Record<string, unknown>, session.user.role)) as Record<string, unknown>[];
  if (format === 'json') {
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), records: rows }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="patients-export.json"' } });
  }
  if (format !== 'csv') return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 });
  return new NextResponse(toCsv(rows, FIELDS), { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="patients-export.csv"' } });
}
