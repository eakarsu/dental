import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { recallSections, runGroundedAi, sectionsText } from '@/lib/grounded-ai';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { patientId } = await request.json().catch(() => ({}));
  if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: session.user.clinicId },
    include: { appointments: true, treatments: true },
  });
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  const now = Date.now();
  const facts = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    completedVisits: patient.appointments.filter((a) => a.status === 'COMPLETED').length,
    upcomingAppointments: patient.appointments.filter((a) => a.startTime.getTime() >= now && a.status !== 'CANCELLED').length,
    plannedTreatments: patient.treatments.filter((t) => t.status === 'PLANNED').length,
    completedTreatments: patient.treatments.filter((t) => t.status === 'COMPLETED').length,
    hasInsuranceOnFile: Boolean(patient.insuranceProvider),
    notes: patient.notes,
  };
  const sections = recallSections(facts);
  const result = await runGroundedAi(
    `Rewrite this administrative dental recall summary for staff. Make no diagnosis or treatment recommendation and invent no facts.\n${sectionsText(sections)}`,
    sections,
  );
  return NextResponse.json(result);
}
