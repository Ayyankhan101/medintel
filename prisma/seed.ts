import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
}

main().catch(console.error).finally(() => prisma.$disconnect())
