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
  console.log()
  console.log('Log in at /login with either account to verify role-based routing works.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
