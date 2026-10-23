import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { scheduleSections, runGroundedAi, sectionsText } from '@/lib/grounded-ai';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { patientId } = await request.json().catch(() => ({}));
  if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: session.user.clinicId },
    include: { appointments: { orderBy: { startTime: 'asc' } } },
  });
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  const now = Date.now();
  const next = patient.appointments.find((a) => a.startTime.getTime() >= now && a.status !== 'CANCELLED');
  const facts = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    nextAppointmentType: next?.type ?? null,
    nextAppointmentAt: next ? next.startTime.toISOString() : null,
    openTasks: await prisma.task.count({ where: { clinicId: session.user.clinicId, patientId, status: { not: 'DONE' } } }),
    hasInsuranceOnFile: Boolean(patient.insuranceProvider),
  };
  const sections = scheduleSections(facts);
  const result = await runGroundedAi(
    `Rewrite this administrative dental schedule brief for staff. Make no diagnosis or treatment recommendation and invent no facts.\n${sectionsText(sections)}`,
    sections,
  );
  return NextResponse.json(result);
}
