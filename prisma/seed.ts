import { PrismaClient, UserRole, AppointmentStatus, AppointmentType, TreatmentStatus, ClaimStatus, ReminderType, ReminderStatus } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// Create Prisma Client with pg adapter for Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function main() {
  console.log('🌱 Starting database seed...')

  const clinic = await prisma.clinic.upsert({
    where: { id: 'demo-clinic' },
    update: {},
    create: { id: 'demo-clinic', name: 'Dental Clinic Demo' },
  })
  const otherClinic = await prisma.clinic.upsert({
    where: { id: 'isolation-clinic' },
    update: {},
    create: { id: 'isolation-clinic', name: 'Isolation Test Clinic' },
  })

  // Create Users
  const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10)

  await prisma.user.upsert({
    where: { email: 'dentist@isolation.invalid' },
    update: {},
    create: {
      clinicId: otherClinic.id,
      email: 'dentist@isolation.invalid',
      password: hashedPassword,
      firstName: 'Isolation',
      lastName: 'Dentist',
      role: UserRole.DENTIST,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dentalclinic.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'admin@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      phone: '555-0100',
    },
  })

  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@dentalclinic.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'receptionist@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.RECEPTIONIST,
      phone: '555-0101',
    },
  })

  const dentist1 = await prisma.user.upsert({
    where: { email: 'dr.smith@dentalclinic.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'dr.smith@dentalclinic.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.DENTIST,
      phone: '555-0102',
    },
  })

  const dentist2 = await prisma.user.upsert({
    where: { email: 'dr.williams@dentalclinic.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'dr.williams@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Williams',
      role: UserRole.DENTIST,
      phone: '555-0103',
    },
  })

  const hygienist = await prisma.user.upsert({
    where: { email: 'hygienist@dentalclinic.com' },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'hygienist@dentalclinic.com',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Garcia',
      role: UserRole.HYGIENIST,
      phone: '555-0104',
    },
  })

  console.log('✅ Users created')

  // Create Patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: 'Michael',
        lastName: 'Anderson',
        dateOfBirth: new Date('1985-03-15'),
        email: 'michael.anderson@example.com',
        phone: '555-1001',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        emergencyContact: 'Jane Anderson',
        emergencyPhone: '555-1002',
        insuranceProvider: 'BlueCross BlueShield',
        insurancePolicyNo: 'BC123456789',
        insuranceGroupNo: 'GRP001',
        medicalHistory: {
          allergies: ['Penicillin'],
          conditions: ['Hypertension'],
          medications: ['Lisinopril 10mg'],
        },
        notes: 'Patient prefers morning appointments',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: 'Jennifer',
        lastName: 'Martinez',
        dateOfBirth: new Date('1992-07-22'),
        email: 'jennifer.martinez@example.com',
        phone: '555-2001',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        emergencyContact: 'Carlos Martinez',
        emergencyPhone: '555-2002',
        insuranceProvider: 'Aetna',
        insurancePolicyNo: 'AET987654321',
        insuranceGroupNo: 'GRP002',
        medicalHistory: {
          allergies: [],
          conditions: ['Diabetes Type 2'],
          medications: ['Metformin 500mg'],
        },
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: 'Robert',
        lastName: 'Taylor',
        dateOfBirth: new Date('1978-11-30'),
        email: 'robert.taylor@example.com',
        phone: '555-3001',
        address: '789 Elm St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        emergencyContact: 'Susan Taylor',
        emergencyPhone: '555-3002',
        insuranceProvider: 'Cigna',
        insurancePolicyNo: 'CIG456789123',
        insuranceGroupNo: 'GRP003',
        medicalHistory: {
          allergies: ['Latex'],
          conditions: [],
          medications: [],
        },
        notes: 'Nervous patient, requires extra care',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: 'Lisa',
        lastName: 'Thompson',
        dateOfBirth: new Date('1995-05-18'),
        email: 'lisa.thompson@example.com',
        phone: '555-4001',
        address: '321 Pine Rd',
        city: 'Houston',
        state: 'TX',
        zipCode: '77001',
        emergencyContact: 'Mark Thompson',
        emergencyPhone: '555-4002',
        insuranceProvider: 'UnitedHealthcare',
        insurancePolicyNo: 'UHC789123456',
        insuranceGroupNo: 'GRP004',
      },
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: 'David',
        lastName: 'Wilson',
        dateOfBirth: new Date('1988-09-05'),
        email: 'david.wilson@example.com',
        phone: '555-5001',
        address: '654 Maple Dr',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
        emergencyContact: 'Anna Wilson',
        emergencyPhone: '555-5002',
        insuranceProvider: 'MetLife',
        insurancePolicyNo: 'MET321654987',
        insuranceGroupNo: 'GRP005',
        medicalHistory: {
          allergies: ['Ibuprofen'],
          conditions: ['Asthma'],
          medications: ['Albuterol inhaler'],
        },
      },
    }),
  ])

  console.log('✅ Patients created')

  // Create Appointments
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        dentistId: dentist1.id,
        type: AppointmentType.CHECKUP,
        status: AppointmentStatus.SCHEDULED,
        startTime: new Date(today.setHours(9, 0, 0, 0)),
        endTime: new Date(today.setHours(9, 30, 0, 0)),
        reason: 'Regular 6-month checkup',
        roomNumber: 'Room 1',
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        dentistId: dentist2.id,
        type: AppointmentType.CLEANING,
        status: AppointmentStatus.CONFIRMED,
        startTime: new Date(today.setHours(10, 0, 0, 0)),
        endTime: new Date(today.setHours(10, 45, 0, 0)),
        reason: 'Teeth cleaning',
        roomNumber: 'Room 2',
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[2].id,
        dentistId: dentist1.id,
        type: AppointmentType.FILLING,
        status: AppointmentStatus.IN_PROGRESS,
        startTime: new Date(today.setHours(11, 0, 0, 0)),
        endTime: new Date(today.setHours(12, 0, 0, 0)),
        reason: 'Cavity filling - tooth #14',
        roomNumber: 'Room 1',
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[3].id,
        dentistId: dentist2.id,
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.SCHEDULED,
        startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(14, 30, 0, 0)),
        reason: 'Crown consultation',
        roomNumber: 'Room 3',
      },
    }),
    prisma.appointment.create({
      data: {
        patientId: patients[4].id,
        dentistId: dentist1.id,
        type: AppointmentType.ROOT_CANAL,
        status: AppointmentStatus.SCHEDULED,
        startTime: new Date(nextWeek.setHours(13, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(15, 0, 0, 0)),
        reason: 'Root canal - tooth #19',
        roomNumber: 'Room 1',
      },
    }),
  ])

  console.log('✅ Appointments created')

  // Create Treatments
  const treatments = await Promise.all([
    prisma.treatment.create({
      data: {
        patientId: patients[0].id,
        appointmentId: appointments[0].id,
        dentistId: dentist1.id,
        treatmentCode: 'D0150',
        treatmentName: 'Comprehensive Oral Evaluation',
        description: 'Complete examination of teeth, gums, and oral tissues',
        status: TreatmentStatus.COMPLETED,
        estimatedCost: 85.00,
        actualCost: 85.00,
        startDate: appointments[0].startTime,
        completionDate: appointments[0].endTime,
        checklist: {
          items: [
            { task: 'Visual examination', completed: true },
            { task: 'Periodontal probing', completed: true },
            { task: 'Oral cancer screening', completed: true },
            { task: 'Document findings', completed: true },
          ],
        },
      },
    }),
    prisma.treatment.create({
      data: {
        patientId: patients[2].id,
        appointmentId: appointments[2].id,
        dentistId: dentist1.id,
        treatmentCode: 'D2391',
        treatmentName: 'Composite Filling - One Surface',
        description: 'Tooth-colored composite filling on tooth #14',
        toothNumber: '14',
        status: TreatmentStatus.IN_PROGRESS,
        estimatedCost: 175.00,
        startDate: appointments[2].startTime,
        checklist: {
          items: [
            { task: 'Anesthesia administered', completed: true },
            { task: 'Decay removed', completed: true },
            { task: 'Cavity prepared', completed: true },
            { task: 'Composite applied', completed: false },
            { task: 'Polishing', completed: false },
          ],
        },
      },
    }),
    prisma.treatment.create({
      data: {
        patientId: patients[4].id,
        dentistId: dentist1.id,
        treatmentCode: 'D3310',
        treatmentName: 'Anterior Root Canal',
        description: 'Endodontic treatment on tooth #19',
        toothNumber: '19',
        status: TreatmentStatus.PLANNED,
        estimatedCost: 950.00,
        checklist: {
          items: [
            { task: 'Pre-operative X-ray', completed: false },
            { task: 'Anesthesia', completed: false },
            { task: 'Access opening', completed: false },
            { task: 'Canal cleaning', completed: false },
            { task: 'Canal filling', completed: false },
            { task: 'Temporary filling', completed: false },
          ],
        },
      },
    }),
    prisma.treatment.create({
      data: {
        patientId: patients[3].id,
        dentistId: dentist2.id,
        treatmentCode: 'D2740',
        treatmentName: 'Porcelain Crown',
        description: 'Full porcelain crown on tooth #3',
        toothNumber: '3',
        status: TreatmentStatus.PLANNED,
        estimatedCost: 1250.00,
        checklist: {
          items: [
            { task: 'Initial consultation', completed: false },
            { task: 'Tooth preparation', completed: false },
            { task: 'Impression taken', completed: false },
            { task: 'Temporary crown placed', completed: false },
            { task: 'Final crown placement', completed: false },
          ],
        },
      },
    }),
  ])

  console.log('✅ Treatments created')

  // Create Insurance Claims
  const claims = await Promise.all([
    prisma.insuranceClaim.create({
      data: {
        patientId: patients[0].id,
        treatmentId: treatments[0].id,
        claimNumber: 'CLM-2025-001',
        insuranceProvider: 'BlueCross BlueShield',
        policyNumber: 'BC123456789',
        status: ClaimStatus.PAID,
        submittedDate: new Date('2025-01-15'),
        approvedDate: new Date('2025-01-20'),
        claimedAmount: 85.00,
        approvedAmount: 85.00,
        paidAmount: 85.00,
      },
    }),
    prisma.insuranceClaim.create({
      data: {
        patientId: patients[2].id,
        treatmentId: treatments[1].id,
        claimNumber: 'CLM-2025-002',
        insuranceProvider: 'Cigna',
        policyNumber: 'CIG456789123',
        status: ClaimStatus.SUBMITTED,
        submittedDate: new Date(),
        claimedAmount: 175.00,
      },
    }),
    prisma.insuranceClaim.create({
      data: {
        patientId: patients[4].id,
        treatmentId: treatments[2].id,
        claimNumber: 'CLM-2025-003',
        insuranceProvider: 'MetLife',
        policyNumber: 'MET321654987',
        status: ClaimStatus.DRAFT,
        claimedAmount: 950.00,
      },
    }),
  ])

  console.log('✅ Insurance claims created')

  // Create Reminders
  const reminders = await Promise.all([
    prisma.reminder.create({
      data: {
        patientId: patients[0].id,
        userId: receptionist.id,
        type: ReminderType.APPOINTMENT,
        status: ReminderStatus.SENT,
        title: 'Appointment Reminder',
        message: 'You have an appointment tomorrow at 9:00 AM with Dr. Smith',
        scheduledAt: new Date(tomorrow.setHours(8, 0, 0, 0)),
        sentAt: new Date(),
        method: 'SMS',
      },
    }),
    prisma.reminder.create({
      data: {
        patientId: patients[1].id,
        userId: receptionist.id,
        type: ReminderType.FOLLOW_UP,
        status: ReminderStatus.PENDING,
        title: '6-Month Checkup Due',
        message: 'It\'s time to schedule your 6-month dental checkup!',
        scheduledAt: new Date(nextWeek),
        method: 'EMAIL',
      },
    }),
  ])

  console.log('✅ Reminders created')

  console.log('🎉 Seed completed successfully!')
  console.log('\n📝 Demo Users:')
  console.log('Demo login users provisioned from the local environment.');
  console.log('Demo login users provisioned from the local environment.');
  console.log('Demo login users provisioned from the local environment.');
  console.log('Demo login users provisioned from the local environment.');
  console.log('Demo login users provisioned from the local environment.');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
