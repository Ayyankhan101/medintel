import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const PASSWORD = 'Demo1234'

export async function GET() {
  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 10)
    const results: string[] = []

    // Seed admin user
    await prisma.user.upsert({
      where: { email: 'admin@demo.medintel.app' },
      update: { name: 'Admin User', role: 'ADMIN' },
      create: {
        email: 'admin@demo.medintel.app',
        phone: '+923001234570',
        passwordHash,
        name: 'Admin User',
        role: 'ADMIN',
        kycStatus: 'VERIFIED',
        kycVerifiedAt: new Date(),
        emailVerified: new Date(),
      },
    })
    results.push('admin@demo.medintel.app')

    // Seed patients
    const patients = [
      { name: 'Fatima Ahmed', email: 'fatima@demo.medintel.app', phone: '+923001234561', cnic: '4220145678901', medIntelCode: 'MED-PK-SEED-FA' },
      { name: 'Mohammad Ali', email: 'ali@demo.medintel.app', phone: '+923001234562', cnic: '4220156789012', medIntelCode: 'MED-PK-SEED-MA' },
      { name: 'Zainab Khan', email: 'zainab@demo.medintel.app', phone: '+923001234563', cnic: '4220178901234', medIntelCode: 'MED-PK-SEED-ZK' },
      { name: 'Ahmed Raza', email: 'ahmed@demo.medintel.app', phone: '+923001234564', cnic: '4220189012345', medIntelCode: 'MED-PK-SEED-AR' },
      { name: 'Sara Ali', email: 'sara@demo.medintel.app', phone: '+923001234565', cnic: '4220190123456', medIntelCode: 'MED-PK-SEED-SA' },
    ]
    for (const p of patients) {
      await prisma.user.upsert({
        where: { email: p.email },
        update: { name: p.name, role: 'PATIENT' },
        create: {
          email: p.email, phone: p.phone, passwordHash,
          name: p.name, role: 'PATIENT',
          cnicNumber: p.cnic, medIntelCode: p.medIntelCode,
          kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
          emailVerified: new Date(),
        },
      })
      results.push(p.email)
    }

    // Seed doctors
    const doctors = [
      { name: 'Dr. Asma Iqbal', email: 'asma@demo.medintel.app', phone: '+923001234551', license: 'PMC-2021-001', spec: 'Cardiology', yrs: 12, fee: 3000, tier: 'SENIOR' },
      { name: 'Dr. Bilal Hashmi', email: 'bilal@demo.medintel.app', phone: '+923001234552', license: 'PMC-2020-002', spec: 'Neurology', yrs: 10, fee: 3500, tier: 'SENIOR' },
      { name: 'Dr. Sana Mehmood', email: 'sana@demo.medintel.app', phone: '+923001234553', license: 'PMC-2023-003', spec: 'Orthopedics', yrs: 4, fee: 2000, tier: 'JUNIOR' },
      { name: 'Dr. Usman Chaudhry', email: 'usman@demo.medintel.app', phone: '+923001234554', license: 'PMC-2019-004', spec: 'Gastroenterology', yrs: 11, fee: 3500, tier: 'SENIOR' },
      { name: 'Dr. Hina Kausar', email: 'hina@demo.medintel.app', phone: '+923001234555', license: 'PMC-2018-005', spec: 'Pulmonology', yrs: 14, fee: 4000, tier: 'SENIOR' },
      { name: 'Dr. Fawad Khan', email: 'fawad@demo.medintel.app', phone: '+923001234556', license: 'PMC-2024-006', spec: 'Dermatology', yrs: 3, fee: 2000, tier: 'JUNIOR' },
      { name: 'Dr. Ayesha Tauqeer', email: 'ayesha@demo.medintel.app', phone: '+923001234557', license: 'PMC-2023-007', spec: 'Psychiatry', yrs: 5, fee: 2500, tier: 'JUNIOR' },
    ]
    for (const d of doctors) {
      await prisma.user.upsert({
        where: { email: d.email },
        update: { name: d.name, role: 'DOCTOR' },
        create: {
          email: d.email, phone: d.phone, passwordHash,
          name: d.name, role: 'DOCTOR',
          kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
          emailVerified: new Date(),
        },
      })
      // Upsert doctor profile
      const user = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })
      if (user) {
        await prisma.doctor.upsert({
          where: { userId: user.id },
          update: { licenseNumber: d.license, specialization: d.spec, yearsExperience: d.yrs, consultationFee: d.fee, kydStatus: 'VERIFIED', trustBadge: true, isOnline: true },
          create: { userId: user.id, licenseNumber: d.license, specialization: d.spec, yearsExperience: d.yrs, consultationFee: d.fee, kydStatus: 'VERIFIED', trustBadge: true, isOnline: true, tier: d.tier as any },
        })
      }
      results.push(d.email)
    }

    return NextResponse.json({ ok: true, seeded: results.length, accounts: results })
  } catch (error) {
    console.error('seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
