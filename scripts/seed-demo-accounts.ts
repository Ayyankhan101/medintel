/**
 * Idempotent seed for demo accounts. Run once against any environment.
 *
 *   DATABASE_URL="postgres://..." npx tsx scripts/seed-demo-accounts.ts
 *
 * Creates:
 *   - 1 patient: patient@demo.medintel.app / Demo1234
 *   - 1 doctor:  doctor@demo.medintel.app  / Demo1234  (KYD-verified, trust-badge, Stripe wired)
 *
 * Safe to run multiple times — uses upsert keyed on email.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PATIENT_EMAIL = 'patient@demo.medintel.app'
const DOCTOR_EMAIL  = 'doctor@demo.medintel.app'
const PASSWORD      = 'Demo1234'

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  // ── Demo patient ───────────────────────────────────────────────────────────
  const patientUser = await prisma.user.upsert({
    where:  { email: PATIENT_EMAIL },
    update: {},
    create: {
      email:         PATIENT_EMAIL,
      phone:         '+923001112222',
      passwordHash,
      name:          'Demo Patient',
      role:          'PATIENT',
      cnicNumber:    '1111122223333',
      medIntelCode:  'MED-PK-DEMO-P',
      kycStatus:     'VERIFIED',
      kycVerifiedAt: new Date(),
    },
  })
  await prisma.patient.upsert({
    where:  { userId: patientUser.id },
    update: {},
    create: {
      userId:           patientUser.id,
      dateOfBirth:      new Date('1995-01-01'),
      gender:           'OTHER',
      address:          'Lahore, Pakistan',
      emergencyContact: '+923009998888',
    },
  })
  console.log(`✔ Demo patient ready: ${PATIENT_EMAIL} / ${PASSWORD}`)

  // ── Demo doctor (fully verified, trust-badged, Stripe wired) ──────────────
  const doctorUser = await prisma.user.upsert({
    where:  { email: DOCTOR_EMAIL },
    update: {},
    create: {
      email:         DOCTOR_EMAIL,
      phone:         '+923004445555',
      passwordHash,
      name:          'Dr. Demo Specialist',
      role:          'DOCTOR',
      medIntelCode:  'MED-PK-DEMO-D',
      kycStatus:     'VERIFIED',
      kycVerifiedAt: new Date(),
    },
  })
  await prisma.doctor.upsert({
    where:  { userId: doctorUser.id },
    update: {},
    create: {
      userId:          doctorUser.id,
      licenseNumber:   'PMDC-DEMO-001',
      specialization:  'General Medicine',
      qualifications:  ['MBBS', 'FCPS'],
      yearsExperience: 12,
      bio:             'Demo physician for the MedIntel MVP. Not a real doctor.',
      consultationFee: 1500,
      stripeAccountId: 'acct_demo_placeholder',
      kydStatus:       'VERIFIED',
      kydTier1At:      new Date(),
      kydTier2At:      new Date(),
      kydTier3At:      new Date(),
      trustBadge:      true,
      rating:          4.8,
      reviewCount:     42,
    },
  })
  console.log(`✔ Demo doctor  ready: ${DOCTOR_EMAIL} / ${PASSWORD}`)

  // ── Demo medical history for the patient ───────────────────────────────────
  const patient = await prisma.patient.findUnique({ where: { userId: patientUser.id } })
  const doctor  = await prisma.doctor.findUnique({ where: { userId: doctorUser.id } })
  if (!patient || !doctor) throw new Error('patient/doctor row missing after upsert')

  const records = [
    { id: 'seed-record-allergy',     type: 'ALLERGY',     title: 'Penicillin allergy',           content: 'Severe rash with penicillin-class antibiotics. Use macrolides instead.' },
    { id: 'seed-record-chronic-htn', type: 'CHRONIC_MED', title: 'Hypertension — Amlodipine 5mg', content: 'Daily 5mg amlodipine since 2024. BP usually 130/85.' },
  ]
  for (const r of records) {
    await prisma.medicalRecord.upsert({
      where:  { id: r.id },
      update: {},
      create: { ...r, patientId: patient.id, recordedAt: new Date('2025-08-01') },
    })
  }
  console.log(`✔ Seeded ${records.length} medical records`)

  // ── Demo appointments at three different stages ────────────────────────────
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  const appts: Array<Parameters<typeof prisma.appointment.upsert>[0]> = [
    {
      where:  { id: 'seed-appt-completed' },
      update: {},
      create: {
        id:               'seed-appt-completed',
        patientId:        patient.id,
        doctorId:         doctor.id,
        status:           'COMPLETED',
        scheduledAt:      new Date(now.getTime() - 7 * dayMs),
        completedAt:      new Date(now.getTime() - 7 * dayMs + 30 * 60 * 1000),
        transcript:       'Headache for 3 days, occasional nausea, no fever. Trying to sleep less because of work.',
        aiSummary:        'Patient reports persistent tension-type headache with mild nausea, likely stress-related. No red-flag symptoms.',
        severityScore:    4,
        severityLevel:    'ROUTINE',
        department:       'General Medicine',
        prescriptionText: 'Paracetamol 500mg, take 1 tablet every 6 hours as needed for pain. Hydrate well. Follow up in 7 days if symptoms persist.',
      },
    },
    {
      where:  { id: 'seed-appt-inprogress' },
      update: {},
      create: {
        id:            'seed-appt-inprogress',
        patientId:     patient.id,
        doctorId:      doctor.id,
        status:        'IN_PROGRESS',
        scheduledAt:   new Date(now.getTime() - 15 * 60 * 1000),
        transcript:    'Sore throat and cough for two days. Voice gone hoarse since yesterday morning.',
        aiSummary:     'Likely acute viral pharyngitis. Symptoms compatible with common URTI; no red flags described.',
        severityScore: 5,
        severityLevel: 'URGENT',
        department:    'General Medicine',
      },
    },
    {
      where:  { id: 'seed-appt-scheduled' },
      update: {},
      create: {
        id:            'seed-appt-scheduled',
        patientId:     patient.id,
        doctorId:      doctor.id,
        status:        'SCHEDULED',
        scheduledAt:   new Date(now.getTime() + 2 * dayMs),
        transcript:    'Routine follow-up for blood pressure.',
        aiSummary:     'Stable hypertensive patient on amlodipine; routine follow-up.',
        severityScore: 3,
        severityLevel: 'ROUTINE',
        department:    'General Medicine',
      },
    },
  ]

  for (const a of appts) await prisma.appointment.upsert(a)
  console.log(`✔ Seeded ${appts.length} appointments (1 COMPLETED, 1 IN_PROGRESS, 1 SCHEDULED)`)

  // Escrow for the completed appointment so the doctor dashboard shows earnings
  await prisma.escrow.upsert({
    where:  { appointmentId: 'seed-appt-completed' },
    update: {},
    create: {
      appointmentId:         'seed-appt-completed',
      amount:                1500,
      currency:              'PKR',
      status:                'RELEASED',
      stripePaymentIntentId: 'pi_demo_completed_001',
      heldAt:                new Date(now.getTime() - 7 * dayMs - 60 * 1000),
      releasedAt:            new Date(now.getTime() - 7 * dayMs + 30 * 60 * 1000),
    },
  })
  console.log('✔ Seeded escrow for completed appointment')

  console.log()
  console.log('Log in at /login with either account to verify role-based routing works.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
