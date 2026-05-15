import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Demo doctors — one per triage department in src/lib/triage.ts, plus a few extras.
// All share the same dev password so it's easy to log in.
const DEMO_PASSWORD = 'demo1234'

const DEMO_DOCTORS = [
  { slug: 'asma-iqbal',      name: 'Dr. Asma Iqbal',      specialization: 'Cardiology',       fee: 2500, years: 14, rating: 4.9, reviews: 312, trust: true,  bio: 'FCPS Cardiology · Punjab Institute of Cardiology · 14 yrs experience.' },
  { slug: 'bilal-hashmi',    name: 'Dr. Bilal Hashmi',    specialization: 'Neurology',        fee: 2800, years: 11, rating: 4.7, reviews: 188, trust: true,  bio: 'FCPS Neurology · stroke and epilepsy specialist.' },
  { slug: 'sana-malik',      name: 'Dr. Sana Malik',      specialization: 'Orthopedics',      fee: 2200, years: 9,  rating: 4.6, reviews: 142, trust: false, bio: 'MS Orthopedic Surgery · sports injuries and joint replacement.' },
  { slug: 'usman-raza',      name: 'Dr. Usman Raza',      specialization: 'Gastroenterology', fee: 2400, years: 12, rating: 4.8, reviews: 221, trust: true,  bio: 'FCPS Gastro · endoscopy and liver disease.' },
  { slug: 'hina-shah',       name: 'Dr. Hina Shah',       specialization: 'Pulmonology',      fee: 2300, years: 10, rating: 4.7, reviews: 164, trust: false, bio: 'FCPS Pulmonology · asthma, COPD, sleep apnea.' },
  { slug: 'fawad-akbar',     name: 'Dr. Fawad Akbar',     specialization: 'Dermatology',      fee: 1800, years: 7,  rating: 4.8, reviews: 256, trust: true,  bio: 'MBBS, Dip Dermatology · acne, eczema, cosmetic derm.' },
  { slug: 'ayesha-tariq',    name: 'Dr. Ayesha Tariq',    specialization: 'Psychiatry',       fee: 2600, years: 8,  rating: 4.9, reviews: 198, trust: true,  bio: 'FCPS Psychiatry · anxiety, depression, CBT.' },
  { slug: 'imran-yousuf',    name: 'Dr. Imran Yousuf',    specialization: 'Ophthalmology',    fee: 2000, years: 13, rating: 4.6, reviews: 173, trust: false, bio: 'FCPS Ophthalmology · cataract and refractive surgery.' },
  { slug: 'maria-khan',      name: 'Dr. Maria Khan',      specialization: 'ENT',              fee: 1900, years: 6,  rating: 4.5, reviews:  98, trust: false, bio: 'FCPS ENT · sinus, hearing, paediatric ENT.' },
  { slug: 'kashif-ahmed',    name: 'Dr. Kashif Ahmed',    specialization: 'Urology',          fee: 2400, years: 15, rating: 4.7, reviews: 211, trust: true,  bio: 'FCPS Urology · kidney stones and prostate care.' },
  // A second cardiologist so "best doctors" shows multiple options.
  { slug: 'rabia-naseer',    name: 'Dr. Rabia Naseer',    specialization: 'Cardiology',       fee: 2200, years: 8,  rating: 4.6, reviews: 121, trust: false, bio: 'FCPS Cardiology · preventive cardiology.' },
  { slug: 'salman-zafar',    name: 'Dr. Salman Zafar',    specialization: 'Cardiology',       fee: 3000, years: 18, rating: 4.8, reviews: 402, trust: true,  bio: 'MD Interventional Cardiology · cath-lab veteran.' },
] as const

const RESOURCES = [
  { name: 'Services Hospital',           type: 'HOSPITAL',   address: 'Jail Rd, Lahore',             latitude: 31.5497, longitude: 74.3436, phone: '042-99205500', isAvailable: true },
  { name: 'Mayo Hospital',               type: 'HOSPITAL',   address: 'Nila Gumbad, Lahore',         latitude: 31.5689, longitude: 74.3108, phone: '042-99201053', isAvailable: true },
  { name: 'Lahore General Hospital',     type: 'HOSPITAL',   address: 'Ferozepur Rd, Lahore',        latitude: 31.5204, longitude: 74.3587, phone: '042-35761999', isAvailable: true },
  { name: 'Jinnah Hospital',             type: 'HOSPITAL',   address: 'Allama Iqbal Rd, Lahore',     latitude: 31.5083, longitude: 74.3271, phone: '042-99231441', isAvailable: true },
  { name: 'City Blood Bank',             type: 'BLOOD_BANK', address: 'Mcleod Rd, Lahore',           latitude: 31.5624, longitude: 74.3181, phone: '042-37354458', isAvailable: true },
  { name: 'Al-Shifa Pharmacy',           type: 'PHARMACY',   address: 'Mall Rd, Lahore',             latitude: 31.5570, longitude: 74.3200, phone: '042-36303030', isAvailable: true },
  { name: 'Al-Habib Pharmacy',           type: 'PHARMACY',   address: 'DHA Phase 5, Lahore',         latitude: 31.4697, longitude: 74.4032, phone: '042-35745050', isAvailable: true },
  { name: 'Medical Store Plus',          type: 'PHARMACY',   address: 'Gulberg III, Lahore',         latitude: 31.5127, longitude: 74.3497, phone: '042-35761234', isAvailable: true },
  { name: 'Rehman Oxygen Services',      type: 'OXYGEN',     address: 'Ravi Rd, Lahore',             latitude: 31.5842, longitude: 74.3063, phone: '0300-4123456', isAvailable: true },
  { name: 'PakMed Oxygen Supply',        type: 'OXYGEN',     address: 'Badami Bagh, Lahore',         latitude: 31.5891, longitude: 74.3215, phone: '0321-5009876', isAvailable: true },
  { name: 'ICU Ventilator Center',       type: 'VENTILATOR', address: 'New Garden Town, Lahore',     latitude: 31.5006, longitude: 74.3361, phone: '0301-8765432', isAvailable: true },
  { name: 'Rescue 1122 Lahore Central',  type: 'AMBULANCE',  address: 'Faisal Town, Lahore',         latitude: 31.5043, longitude: 74.3284, phone: '1122',         isAvailable: true },
  { name: 'Edhi Foundation Ambulance',   type: 'AMBULANCE',  address: 'Shah Alam Market, Lahore',    latitude: 31.5741, longitude: 74.3156, phone: '115',          isAvailable: true },
]

async function main() {
  console.log('Seeding medical resources...')
  for (const r of RESOURCES) {
    await prisma.medicalResource.upsert({
      where:  { id: `seed-${r.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: r,
      create: { id: `seed-${r.name.toLowerCase().replace(/\s+/g, '-')}`, ...r },
    })
  }
  console.log(`Seeded ${RESOURCES.length} resources.`)

  console.log('Seeding demo doctors...')
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  for (const d of DEMO_DOCTORS) {
    const userId   = `seed-user-${d.slug}`
    const doctorId = `seed-doctor-${d.slug}`
    const email    = `${d.slug}@demo.medintel.app`
    const phone    = `+923000${String(Math.abs(hash(d.slug)) % 1_000_000).padStart(6, '0')}`
    const license  = `PMDC-DEMO-${d.slug.toUpperCase().replace(/-/g, '').slice(0, 8)}`

    await prisma.user.upsert({
      where:  { id: userId },
      update: { email, phone, name: d.name },
      create: {
        id: userId, email, phone, name: d.name,
        passwordHash, role: 'DOCTOR',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
      },
    })

    await prisma.doctor.upsert({
      where:  { id: doctorId },
      update: {
        specialization:  d.specialization,
        consultationFee: d.fee,
        yearsExperience: d.years,
        rating:          d.rating,
        reviewCount:     d.reviews,
        trustBadge:      d.trust,
        bio:             d.bio,
        kydStatus:       'VERIFIED',
      },
      create: {
        id: doctorId, userId, licenseNumber: license,
        specialization:  d.specialization,
        qualifications:  [d.bio.split('·')[0].trim()],
        yearsExperience: d.years,
        bio:             d.bio,
        consultationFee: d.fee,
        rating:          d.rating,
        reviewCount:     d.reviews,
        trustBadge:      d.trust,
        kydStatus:       'VERIFIED',
        kydTier1At:      new Date(),
        kydTier2At:      new Date(),
        kydTier3At:      new Date(),
      },
    })
  }
  console.log(`Seeded ${DEMO_DOCTORS.length} demo doctors (password: ${DEMO_PASSWORD}).`)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

main().catch(console.error).finally(() => prisma.$disconnect())
