import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const PASSWORD = 'Demo1234'
const MS = 24 * 60 * 60 * 1000
const isSQLite = (process.env.DATABASE_URL ?? '').startsWith('file:')

function qs(arr: string[]): string[] {
  return isSQLite ? (JSON.stringify(arr) as unknown as string[]) : arr
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jf(val: unknown): any {
  return isSQLite ? JSON.stringify(val) : val
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Seed data ─────────────────────────────────────────────────────────────────

interface PatientSeed {
  name: string; email: string; phone: string; role: 'PATIENT'
  cnic: string; medIntelCode: string
  dob: Date; gender: string; address: string; emergencyContact: string
  records: { type: string; title: string; content: string }[]
}

const PATIENTS: PatientSeed[] = [
  {
    name: 'Fatima Ahmed', email: 'fatima@demo.medintel.app', phone: '+923001234561',
    role: 'PATIENT', cnic: '4220145678901', medIntelCode: 'MED-PK-SEED-FA',
    dob: new Date('1996-04-15'), gender: 'FEMALE',
    address: 'Gulberg III, Lahore', emergencyContact: '+923009991111',
    records: [
      { type: 'ALLERGY', title: 'Sulfa allergy', content: 'Develops hives with sulfonamide antibiotics. Avoid co-trimoxazole.' },
      { type: 'CHRONIC_MED', title: 'Migraine — Rizatriptan PRN', content: 'Diagnosed with migraine with aura at age 22. Uses rizatriptan 10mg at onset. Average 2 attacks/month.' },
    ],
  },
  {
    name: 'Mohammad Ali', email: 'ali@demo.medintel.app', phone: '+923001234562',
    role: 'PATIENT', cnic: '4220156789012', medIntelCode: 'MED-PK-SEED-MA',
    dob: new Date('1969-11-02'), gender: 'MALE',
    address: 'Defence Phase 5, Lahore', emergencyContact: '+923009992222',
    records: [
      { type: 'CHRONIC_MED', title: 'Type 2 Diabetes — Metformin 500mg', content: 'Diagnosed 2018. HbA1c 7.2% (Mar 2025). Metformin 500mg twice daily.' },
      { type: 'CHRONIC_MED', title: 'Hypertension — Losartan 50mg', content: 'Diagnosed 2020. BP usually 135/85 on losartan 50mg daily.' },
      { type: 'SOCIAL', title: 'Smoker — 20 pack-years', content: 'Smokes 10-15 cigarettes/day since age 35. Advised cessation multiple times.' },
    ],
  },
  {
    name: 'Zainab Khan', email: 'zainab@demo.medintel.app', phone: '+923001234563',
    role: 'PATIENT', cnic: '4220178901234', medIntelCode: 'MED-PK-SEED-ZK',
    dob: new Date('2000-09-20'), gender: 'FEMALE',
    address: 'Clifton, Karachi', emergencyContact: '+923009993333',
    records: [
      { type: 'ALLERGY', title: 'Dust mite allergy', content: 'Seasonal allergic rhinitis. Uses cetirizine PRN.' },
    ],
  },
  {
    name: 'Ahmed Raza', email: 'ahmed@demo.medintel.app', phone: '+923001234564',
    role: 'PATIENT', cnic: '4220189012345', medIntelCode: 'MED-PK-SEED-AR',
    dob: new Date('1989-03-10'), gender: 'MALE',
    address: 'Model Town, Lahore', emergencyContact: '+923009994444',
    records: [
      { type: 'CHRONIC_MED', title: 'GERD — Omeprazole 20mg', content: 'Chronic reflux since 2022. Well-controlled on omeprazole 20mg daily.' },
    ],
  },
  {
    name: 'Sara Bibi', email: 'sara@demo.medintel.app', phone: '+923001234565',
    role: 'PATIENT', cnic: '4220190123456', medIntelCode: 'MED-PK-SEED-SB',
    dob: new Date('1959-07-25'), gender: 'FEMALE',
    address: 'Garden Town, Lahore', emergencyContact: '+923009995555',
    records: [
      { type: 'CHRONIC_MED', title: 'Osteoarthritis — knees', content: 'Bilateral knee OA diagnosed 2021. Uses paracetamol PRN. Declined NSAIDs due to gastritis history.' },
      { type: 'CHRONIC_MED', title: 'Hypothyroidism — Thyroxine 50mcg', content: 'Diagnosed 2019. TSH 3.1 (last check Feb 2025). Stable on 50mcg daily.' },
    ],
  },
]

interface DoctorSeed {
  id: string; userId: string; email: string; phone: string; name: string
  licenseNumber: string; specialization: string; fee: number; years: number
  rating: number; reviews: number; trust: boolean; bio: string
  isOnline: boolean; tier: 'JUNIOR' | 'SENIOR'
}

const DEMO_DOCTORS: DoctorSeed[] = [
  { id: 'seed-doctor-asma-iqbal', userId: 'seed-user-asma-iqbal', email: 'asma@demo.medintel.app', phone: '+923001111101', name: 'Dr. Asma Iqbal', licenseNumber: 'PMDC-SEED-001', specialization: 'Cardiology', fee: 2500, years: 14, rating: 4.9, reviews: 312, trust: true, bio: 'FCPS Cardiology · Punjab Institute of Cardiology · 14 yrs experience.', isOnline: true, tier: 'SENIOR' },
  { id: 'seed-doctor-bilal-hashmi', userId: 'seed-user-bilal-hashmi', email: 'bilal@demo.medintel.app', phone: '+923001111102', name: 'Dr. Bilal Hashmi', licenseNumber: 'PMDC-SEED-002', specialization: 'Neurology', fee: 2800, years: 11, rating: 4.7, reviews: 188, trust: true, bio: 'FCPS Neurology · stroke and epilepsy specialist.', isOnline: true, tier: 'SENIOR' },
  { id: 'seed-doctor-sana-malik', userId: 'seed-user-sana-malik', email: 'sana@demo.medintel.app', phone: '+923001111103', name: 'Dr. Sana Malik', licenseNumber: 'PMDC-SEED-003', specialization: 'Orthopedics', fee: 2200, years: 9, rating: 4.6, reviews: 142, trust: false, bio: 'MS Orthopedic Surgery · sports injuries and joint replacement.', isOnline: true, tier: 'JUNIOR' },
  { id: 'seed-doctor-usman-raza', userId: 'seed-user-usman-raza', email: 'usman@demo.medintel.app', phone: '+923001111104', name: 'Dr. Usman Raza', licenseNumber: 'PMDC-SEED-004', specialization: 'Gastroenterology', fee: 2400, years: 12, rating: 4.8, reviews: 221, trust: true, bio: 'FCPS Gastro · endoscopy and liver disease.', isOnline: false, tier: 'SENIOR' },
  { id: 'seed-doctor-hina-shah', userId: 'seed-user-hina-shah', email: 'hina@demo.medintel.app', phone: '+923001111105', name: 'Dr. Hina Shah', licenseNumber: 'PMDC-SEED-005', specialization: 'Pulmonology', fee: 2300, years: 10, rating: 4.7, reviews: 164, trust: false, bio: 'FCPS Pulmonology · asthma, COPD, sleep apnea.', isOnline: false, tier: 'SENIOR' },
  { id: 'seed-doctor-fawad-akbar', userId: 'seed-user-fawad-akbar', email: 'fawad@demo.medintel.app', phone: '+923001111106', name: 'Dr. Fawad Akbar', licenseNumber: 'PMDC-SEED-006', specialization: 'Dermatology', fee: 1800, years: 7, rating: 4.8, reviews: 256, trust: true, bio: 'MBBS, Dip Dermatology · acne, eczema, cosmetic derm.', isOnline: false, tier: 'JUNIOR' },
  { id: 'seed-doctor-ayesha-tariq', userId: 'seed-user-ayesha-tariq', email: 'ayesha@demo.medintel.app', phone: '+923001111107', name: 'Dr. Ayesha Tariq', licenseNumber: 'PMDC-SEED-007', specialization: 'Psychiatry', fee: 2600, years: 8, rating: 4.9, reviews: 198, trust: true, bio: 'FCPS Psychiatry · anxiety, depression, CBT.', isOnline: false, tier: 'JUNIOR' },
  { id: 'seed-doctor-imran-yousuf', userId: 'seed-user-imran-yousuf', email: 'imran@demo.medintel.app', phone: '+923001111108', name: 'Dr. Imran Yousuf', licenseNumber: 'PMDC-SEED-008', specialization: 'Ophthalmology', fee: 2000, years: 13, rating: 4.6, reviews: 173, trust: false, bio: 'FCPS Ophthalmology · cataract and refractive surgery.', isOnline: false, tier: 'SENIOR' },
  { id: 'seed-doctor-maria-khan', userId: 'seed-user-maria-khan', email: 'maria@demo.medintel.app', phone: '+923001111109', name: 'Dr. Maria Khan', licenseNumber: 'PMDC-SEED-009', specialization: 'ENT', fee: 1900, years: 6, rating: 4.5, reviews: 98, trust: false, bio: 'FCPS ENT · sinus, hearing, paediatric ENT.', isOnline: false, tier: 'JUNIOR' },
  { id: 'seed-doctor-kashif-ahmed', userId: 'seed-user-kashif-ahmed', email: 'kashif@demo.medintel.app', phone: '+923001111110', name: 'Dr. Kashif Ahmed', licenseNumber: 'PMDC-SEED-010', specialization: 'Urology', fee: 2400, years: 15, rating: 4.7, reviews: 211, trust: true, bio: 'FCPS Urology · kidney stones and prostate care.', isOnline: false, tier: 'SENIOR' },
  { id: 'seed-doctor-rabia-naseer', userId: 'seed-user-rabia-naseer', email: 'rabia@demo.medintel.app', phone: '+923001111111', name: 'Dr. Rabia Naseer', licenseNumber: 'PMDC-SEED-011', specialization: 'Cardiology', fee: 2200, years: 8, rating: 4.6, reviews: 121, trust: false, bio: 'FCPS Cardiology · preventive cardiology.', isOnline: false, tier: 'JUNIOR' },
  { id: 'seed-doctor-salman-zafar', userId: 'seed-user-salman-zafar', email: 'salman@demo.medintel.app', phone: '+923001111112', name: 'Dr. Salman Zafar', licenseNumber: 'PMDC-SEED-012', specialization: 'Cardiology', fee: 3000, years: 18, rating: 4.8, reviews: 402, trust: true, bio: 'MD Interventional Cardiology · cath-lab veteran.', isOnline: true, tier: 'SENIOR' },
]

interface TriageSeed {
  id: string; patientEmail: string; transcript: string; summary: string
  severityScore: number; severityLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL'
  department: string; minutesAgo: number
}

const TRIAGES: TriageSeed[] = [
  { id: 'seed-triage-fatima-migraine', patientEmail: 'fatima@demo.medintel.app',
    transcript: 'I have severe throbbing headache on the right side of my head. It started with blurry spots in my vision about an hour before the pain began. Now I feel nauseous and extremely sensitive to light and sound. The pain is unbearable — I cannot work or concentrate. This has happened maybe 3-4 times in the last two months. Each episode lasts about 6-8 hours. I had a mild headache yesterday too.',
    summary: 'Patient reports recurrent severe unilateral throbbing headache preceded by visual aura, accompanied by nausea, photophobia, and phonophobia. Episodes lasting 6-8 hours, increasing frequency over 2 months. Consistent with migraine with aura.',
    severityScore: 6, severityLevel: 'URGENT', department: 'Neurology', minutesAgo: 6 * 24 * 60 },
  { id: 'seed-triage-mohammad-chest', patientEmail: 'ali@demo.medintel.app',
    transcript: 'I woke up with crushing chest pain that radiates down my left arm. I am sweating profusely and feel short of breath just sitting here. My heart is racing. I feel nauseous and lightheaded. This has been going on for about 30 minutes. I am 55 years old, diabetic, and my blood pressure was 180/110 when I checked at home.',
    summary: 'CRITICAL: 55-year-old diabetic male with acute onset crushing chest pain radiating to left arm, diaphoresis, dyspnoea, nausea, and hypertension. Suspicion of acute coronary syndrome. Requires immediate senior cardiology assessment.',
    severityScore: 9, severityLevel: 'CRITICAL', department: 'Cardiology', minutesAgo: 8 * 24 * 60 },
  { id: 'seed-triage-zainab-rash', patientEmail: 'zainab@demo.medintel.app',
    transcript: 'I have developed a red, itchy rash on my face and arms over the last week. The skin feels dry and occasionally burns. I have been using a new moisturizer but stopped when the rash appeared. Over-the-counter hydrocortisone cream helps a little but it comes back.',
    summary: 'Patient presents with erythematous pruritic rash on face and arms for 1 week, possibly contact dermatitis or eczema flare. Mild symptoms, no systemic features.',
    severityScore: 2, severityLevel: 'ROUTINE', department: 'Dermatology', minutesAgo: 4 * 24 * 60 },
  { id: 'seed-triage-ahmed-stomach', patientEmail: 'ahmed@demo.medintel.app',
    transcript: 'I have a burning pain in my upper abdomen that gets worse after meals. I feel bloated and gassy, and sometimes I get nauseous. I have had heartburn for years but this is different — the pain is sharper and more localized. I have been taking over-the-counter antacids but they do not help much.',
    summary: 'Patient reports epigastric burning pain exacerbated by meals, bloating, nausea, and heartburn. Possible gastritis or peptic ulcer disease. Needs gastroenterology evaluation.',
    severityScore: 4, severityLevel: 'ROUTINE', department: 'Gastroenterology', minutesAgo: 2 * 24 * 60 },
  { id: 'seed-triage-sara-knee', patientEmail: 'sara@demo.medintel.app',
    transcript: 'My right knee has been severely painful for the past week. It is swollen and feels warm. Walking upstairs is impossible — I have to go one step at a time. There is a grinding sensation when I bend it. The pain is worse in the morning and after sitting for a long time. I have had knee issues for about 4 years but this flare is the worst yet. I am 65 years old and have osteoarthritis.',
    summary: '65-year-old female with known bilateral knee osteoarthritis presenting with acute flare: severe pain, swelling, crepitus, and functional limitation. Difficulty weight-bearing and climbing stairs.',
    severityScore: 6, severityLevel: 'URGENT', department: 'Orthopedics', minutesAgo: 60 },
  { id: 'seed-triage-fatima-general', patientEmail: 'fatima@demo.medintel.app',
    transcript: 'Feeling tired and rundown for a few days. Slight headache but nothing like my migraines. Probably just need to rest.',
    summary: 'Mild generalised fatigue and low-grade headache. No red-flag symptoms.',
    severityScore: 2, severityLevel: 'ROUTINE', department: 'General Medicine', minutesAgo: 3 * 24 * 60 },
]

interface ApptSeed {
  id: string; patientEmail: string; doctorId: string; status: string
  scheduledOffset: number; durationMin: number
  transcript?: string; aiSummary?: string; severityScore?: number
  severityLevel?: string; department?: string
  prescriptionText?: string
  completedOffset?: number; cancelledOffset?: number
  cancellationReason?: string; cancelledBy?: string
  consentOffset?: number; reminderOffset?: number
}

const NOW = new Date()

const APPTS: ApptSeed[] = [
  {
    id: 'seed-appt-mohammad-completed', patientEmail: 'ali@demo.medintel.app',
    doctorId: 'seed-doctor-salman-zafar',
    status: 'COMPLETED', scheduledOffset: -8 * MS, durationMin: 45,
    transcript: 'Patient is a 55-year-old diabetic male with acute chest pain. Pain began at rest, crushing quality, radiating to left arm. Associated diaphoresis, nausea, dyspnoea. BP 175/105, HR 92, SpO2 97%. ECG showed ST depression in leads V4-V6. Troponin I elevated at 2.4 ng/mL. Diagnosis: Non-ST elevation myocardial infarction (NSTEMI). Patient counselled and referred to cardiologist for angiography. Started on aspirin 300mg stat, clopidogrel 600mg stat, atorvastatin 80mg, and sublingual GTN PRN.',
    aiSummary: 'NSTEMI diagnosed in diabetic male with typical chest pain, ECG changes, and elevated troponin. Immediate medical management initiated and cardiology referral arranged.',
    severityScore: 9, severityLevel: 'CRITICAL', department: 'Cardiology',
    prescriptionText: '1. Aspirin 75mg once daily\n2. Clopidogrel 75mg once daily\n3. Atorvastatin 80mg once daily at bedtime\n4. Metoprolol 25mg twice daily\n5. GTN spray 0.4mg sublingual as needed for chest pain\n6. Follow up with interventional cardiology within 48 hours\n7. Strict BP monitoring — target <130/80\n8. Hold Metformin until renal function checked post-angiogram',
    completedOffset: -8 * MS + 50 * 60 * 1000,
    consentOffset: -8 * MS - 5 * 60 * 1000,
    reminderOffset: -8 * MS - 24 * 60 * 60 * 1000,
  },
  {
    id: 'seed-appt-fatima-completed', patientEmail: 'fatima@demo.medintel.app',
    doctorId: 'seed-doctor-bilal-hashmi',
    status: 'COMPLETED', scheduledOffset: -3 * MS, durationMin: 30,
    transcript: '28-year-old female with recurrent severe unilateral headaches preceded by visual aura. Reports 3-4 episodes in the last 2 months, each lasting 6-8 hours. Pain is throbbing, right-sided, associated with nausea, photophobia, and phonophobia. Neurological exam normal. No focal deficits. BP 118/76. No history of head trauma. Family history of migraine (mother). Diagnosis: Migraine with aura (G43.0).',
    aiSummary: 'Classic migraine with aura in young female. Normal neurological exam. Prophylaxis and acute treatment discussed.',
    severityScore: 6, severityLevel: 'URGENT', department: 'Neurology',
    prescriptionText: '1. Sumatriptan 50mg tablet at onset of headache, may repeat once after 2 hours if no response (max 100mg/day)\n2. Propranolol 40mg once daily for migraine prophylaxis\n3. Keep headache diary — record frequency, triggers, and response to medication\n4. Return to clinic if frequency increases or if new neurological symptoms develop\n5. Lifestyle: regular sleep schedule, avoid skipping meals, limit caffeine to 1 cup/day',
    completedOffset: -3 * MS + 35 * 60 * 1000,
    consentOffset: -3 * MS - 5 * 60 * 1000,
    reminderOffset: -3 * MS - 24 * 60 * 60 * 1000,
  },
  {
    id: 'seed-appt-zainab-cancelled', patientEmail: 'zainab@demo.medintel.app',
    doctorId: 'seed-doctor-fawad-akbar',
    status: 'CANCELLED', scheduledOffset: -1 * MS, durationMin: 30,
    transcript: 'Red itchy rash on face and arms for 1 week. Stopped using new moisturizer. Mild improvement with OTC hydrocortisone.',
    aiSummary: 'Likely contact dermatitis. Avoid irritants, trial of topical steroid.',
    severityScore: 2, severityLevel: 'ROUTINE', department: 'Dermatology',
    cancelledOffset: -1 * MS - 2 * 60 * 60 * 1000,
    cancellationReason: 'Patient reported symptoms had resolved and no longer needed consultation.',
    cancelledBy: 'PATIENT',
    consentOffset: -1 * MS - 5 * 60 * 1000,
  },
  {
    id: 'seed-appt-ahmed-scheduled', patientEmail: 'ahmed@demo.medintel.app',
    doctorId: 'seed-doctor-usman-raza',
    status: 'SCHEDULED', scheduledOffset: 3 * MS, durationMin: 30,
    transcript: 'Burning epigastric pain for 2 weeks, worse after meals, bloating, nausea, heartburn. OTC antacids not effective.',
    aiSummary: 'Epigastric pain suggestive of gastritis or PUD. Endoscopy may be indicated if no response to PPI therapy.',
    severityScore: 4, severityLevel: 'ROUTINE', department: 'Gastroenterology',
    consentOffset: -1 * MS,
  },
  {
    id: 'seed-appt-sara-inprogress', patientEmail: 'sara@demo.medintel.app',
    doctorId: 'seed-doctor-sana-malik',
    status: 'IN_PROGRESS', scheduledOffset: -15 * 60 * 1000, durationMin: 30,
    transcript: '65-year-old female with acute right knee pain flare. Known bilateral knee OA. Swelling, warmth, crepitus, difficulty weight-bearing. Pain 8/10 today.',
    aiSummary: 'Acute osteoarthritis flare in elderly patient. Manage pain and inflammation, consider imaging if effusion present.',
    severityScore: 6, severityLevel: 'URGENT', department: 'Orthopedics',
    consentOffset: -15 * 60 * 1000 - 5 * 60 * 1000,
  },
]

interface NoteSeed {
  appointmentId: string
  subjective: string; objective: string; assessment: string; plan: string
  icdHints: string[]; language: string; modelUsed: string
}

const NOTES: NoteSeed[] = [
  {
    appointmentId: 'seed-appt-mohammad-completed',
    subjective: '55-year-old male with known type 2 diabetes and hypertension presents with acute onset crushing chest pain radiating to left arm, associated with diaphoresis, nausea, and dyspnoea. Pain began at rest approximately 1 hour before presentation. Patient is a smoker with 20 pack-year history.',
    objective: 'BP 175/105 (right arm, seated), HR 92 bpm regular, SpO2 97% RA, Temp 36.8°C. BMI 31. Cardiovascular: S1S2 normal, no murmurs/rubs/gallops. Lungs clear bilaterally. ECG: ST depression 1.5mm in V4-V6, T wave inversion in III and aVF. Labs: Troponin I 2.4 ng/mL (ref <0.04), CK-MB 28 ng/mL, creatinine 1.1 mg/dL, glucose 198 mg/dL.',
    assessment: 'Non-ST elevation myocardial infarction (NSTEMI) — GRACE score 142 (intermediate risk). Type 2 diabetes with poor glycaemic control. Hypertension stage 2. Tobacco use disorder.',
    plan: '1. Admit to CCU for telemetry monitoring\n2. Start dual antiplatelet therapy: aspirin 81mg + ticagrelor 90mg\n3. Start atorvastatin 80mg, metoprolol 25mg BID\n4. Cardiology consultation for angiography within 24h\n5. Hold metformin until post-angiogram renal function\n6. Smoking cessation counselling\n7. Target BP <130/80, HR 50-60',
    icdHints: ['I21.4', 'I10', 'E11.9', 'Z87.891'],
    language: 'en', modelUsed: 'seed-data',
  },
  {
    appointmentId: 'seed-appt-fatima-completed',
    subjective: '28-year-old female reports recurrent severe right-sided throbbing headaches preceded by visual aura (blurry spots, zigzag lines). Episodes last 6-8 hours, occurring 3-4 times in the past 2 months. Associated symptoms include nausea, photophobia, and phonophobia. No history of head trauma. Family history positive for migraine (mother).',
    objective: 'Alert and oriented x3. Cranial nerves II-XII intact. No focal neurological deficits. Fundoscopy normal. Pupils equal and reactive to light. Motor strength 5/5 all extremities. Sensation intact. Coordination normal. Neck supple, no meningeal signs. BP 118/76, HR 72 regular, afebrile.',
    assessment: 'Migraine with aura (G43.0). No evidence of secondary headache syndromes. Normal neurological exam.',
    plan: '1. Acute treatment: Sumatriptan 50mg at onset of headache, may repeat once after 2 hours if needed\n2. Prophylaxis: Propranolol 40mg daily, titrate to 80mg if tolerated\n3. Lifestyle modifications: regular sleep-wake cycle, adequate hydration, avoid known triggers (skipped meals, irregular sleep, bright screens before bed)\n4. Headache diary for 8 weeks to track frequency and triggers\n5. Follow up in 4 weeks to assess response to prophylaxis',
    icdHints: ['G43.0', 'R51'],
    language: 'en', modelUsed: 'seed-data',
  },
  {
    appointmentId: 'seed-appt-sara-inprogress',
    subjective: '65-year-old female with known bilateral knee osteoarthritis presents with severe right knee pain for 1 week. Pain worse in morning and after prolonged sitting. Difficulty climbing stairs, grinding sensation when bending knee. Current pain 8/10. Tried paracetamol with minimal relief. No history of trauma or falls.',
    objective: 'Right knee: moderate effusion, warmth to touch, crepitus on flexion/extension. ROM: 10°-110° (limited by pain). No erythema. Ligamentous stability intact. Left knee: mild crepitus, no effusion. Distal pulses intact. Antalgic gait. BMI 29.',
    assessment: 'Acute exacerbation of bilateral knee osteoarthritis (M17.0), right greater than left. Likely inflammatory component given warmth and effusion.',
    plan: '1. Rest and ice pack application for 20 min 3x daily\n2. Naproxen 250mg twice daily with food for 10 days (monitor for GI side effects given gastritis history)\n3. Continue paracetamol 1g PRN for breakthrough pain (max 3g/day)\n4. Knee X-ray (weight-bearing AP + lateral) to assess joint space narrowing\n5. Consider intra-articular hyaluronic acid injection if no response to conservative measures\n6. Referral to physiotherapy for quadriceps strengthening and gait training',
    icdHints: ['M17.0', 'M25.46'],
    language: 'en', modelUsed: 'seed-data',
  },
]

interface ReviewSeed {
  appointmentId: string; patientEmail: string; doctorId: string
  rating: number; comment: string
}

const REVIEWS: ReviewSeed[] = [
  { appointmentId: 'seed-appt-mohammad-completed', patientEmail: 'ali@demo.medintel.app', doctorId: 'seed-doctor-salman-zafar', rating: 5, comment: 'Dr. Salman was incredibly thorough and handled a scary situation with complete professionalism. He explained everything clearly and made sure I understood my treatment plan. Truly grateful.' },
  { appointmentId: 'seed-appt-fatima-completed', patientEmail: 'fatima@demo.medintel.app', doctorId: 'seed-doctor-bilal-hashmi', rating: 5, comment: 'Very knowledgeable and patient. Took time to explain migraine triggers and gave me a practical management plan. Finally feels like someone is taking my headaches seriously.' },
]

interface NotifSeed {
  userId: string; category: string; title: string; body: string; href?: string; read?: boolean
}

interface AuditSeed {
  actorId?: string; actorRole: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown>
}

interface ResearchSeed {
  windowDays: number; totalCases: number; avgSeverity: number
  summary: string; keyFindings: string[]; topDiseases: Record<string, number>; modelUsed: string
}

// ── Main seed logic ───────────────────────────────────────────────────────────

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const now = new Date()

  console.log('━━━ Seeding medical resources ──────────────────────────────────────')
  await seedResources()
  console.log('━━━ Seeding users + profiles ───────────────────────────────────────')
  const userMap = await seedUsers(passwordHash)
  console.log('━━━ Seeding doctors ────────────────────────────────────────────────')
  const doctorMap = await seedDoctors(passwordHash, userMap)
  console.log('━━━ Seeding patients ───────────────────────────────────────────────')
  const patientMap = await seedPatients(userMap)
  console.log('━━━ Seeding medical records ────────────────────────────────────────')
  await seedMedicalRecords(patientMap)
  console.log('━━━ Seeding triages ────────────────────────────────────────────────')
  await seedTriages(patientMap)
  console.log('━━━ Seeding appointments ───────────────────────────────────────────')
  const apptMap = await seedAppointments(patientMap, doctorMap)
  console.log('━━━ Seeding consultation notes ─────────────────────────────────────')
  await seedNotes(apptMap)
  console.log('━━━ Seeding escrow ─────────────────────────────────────────────────')
  await seedEscrow(apptMap)
  console.log('━━━ Seeding reviews ────────────────────────────────────────────────')
  await seedReviews(patientMap, doctorMap)
  console.log('━━━ Seeding notifications ──────────────────────────────────────────')
  if (!isSQLite) await seedNotifications(userMap, doctorMap)
  else console.log('  ⚠ Skipping notifications (SQLite schema lacks model)')
  console.log('━━━ Seeding audit log ──────────────────────────────────────────────')
  await seedAuditLog(userMap)
  console.log('━━━ Seeding research insights ──────────────────────────────────────')
  await seedResearch()
  console.log('━━━ Seeding clinic ─────────────────────────────────────────────────')
  await seedClinic(userMap, doctorMap)
  console.log('\n✔ Seed complete. Log in with any account password: Demo1234')
}

// ── Resources ─────────────────────────────────────────────────────────────────

const RESOURCES = [
  { name: 'Services Hospital',           type: 'HOSPITAL',   address: 'Jail Rd, Lahore',             lat: 31.5497, lng: 74.3436, phone: '042-99205500' },
  { name: 'Mayo Hospital',               type: 'HOSPITAL',   address: 'Nila Gumbad, Lahore',         lat: 31.5689, lng: 74.3108, phone: '042-99201053' },
  { name: 'Lahore General Hospital',     type: 'HOSPITAL',   address: 'Ferozepur Rd, Lahore',        lat: 31.5204, lng: 74.3587, phone: '042-35761999' },
  { name: 'Jinnah Hospital',             type: 'HOSPITAL',   address: 'Allama Iqbal Rd, Lahore',     lat: 31.5083, lng: 74.3271, phone: '042-99231441' },
  { name: 'City Blood Bank',             type: 'BLOOD_BANK', address: 'Mcleod Rd, Lahore',           lat: 31.5624, lng: 74.3181, phone: '042-37354458' },
  { name: 'Al-Shifa Pharmacy',           type: 'PHARMACY',   address: 'Mall Rd, Lahore',             lat: 31.5570, lng: 74.3200, phone: '042-36303030' },
  { name: 'Al-Habib Pharmacy',           type: 'PHARMACY',   address: 'DHA Phase 5, Lahore',         lat: 31.4697, lng: 74.4032, phone: '042-35745050' },
  { name: 'Medical Store Plus',          type: 'PHARMACY',   address: 'Gulberg III, Lahore',         lat: 31.5127, lng: 74.3497, phone: '042-35761234' },
  { name: 'Rehman Oxygen Services',      type: 'OXYGEN',     address: 'Ravi Rd, Lahore',             lat: 31.5842, lng: 74.3063, phone: '0300-4123456' },
  { name: 'PakMed Oxygen Supply',        type: 'OXYGEN',     address: 'Badami Bagh, Lahore',         lat: 31.5891, lng: 74.3215, phone: '0321-5009876' },
  { name: 'ICU Ventilator Center',       type: 'VENTILATOR', address: 'New Garden Town, Lahore',     lat: 31.5006, lng: 74.3361, phone: '0301-8765432' },
  { name: 'Rescue 1122 Lahore Central',  type: 'AMBULANCE',  address: 'Faisal Town, Lahore',         lat: 31.5043, lng: 74.3284, phone: '1122' },
  { name: 'Edhi Foundation Ambulance',   type: 'AMBULANCE',  address: 'Shah Alam Market, Lahore',    lat: 31.5741, lng: 74.3156, phone: '115' },
]

async function seedResources() {
  for (const r of RESOURCES) {
    await prisma.medicalResource.upsert({
      where:  { id: `seed-resource-${slug(r.name)}` },
      update: {},
      create: {
        id: `seed-resource-${slug(r.name)}`,
        name: r.name, type: r.type, address: r.address,
        latitude: r.lat, longitude: r.lng,
        phone: r.phone, isAvailable: true,
      },
    })
  }
  console.log(`  ✔ ${RESOURCES.length} resources`)
}

// ── Users ─────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@demo.medintel.app'
const CLINIC_EMAIL = 'clinic@demo.medintel.app'
const DEMO_DOCTOR_EMAIL = 'doctor@demo.medintel.app'
const DEMO_PATIENT_EMAIL = 'patient@demo.medintel.app'

async function seedUsers(passwordHash: string) {
  const map: Record<string, string> = {}

  // Seed non-doctor users
  const nonDoctors = [
    ...PATIENTS.map(p => ({ name: p.name, email: p.email, phone: p.phone, role: 'PATIENT' as const, cnic: p.cnic, medIntelCode: p.medIntelCode })),
    { name: 'Admin User', email: ADMIN_EMAIL, phone: '+923001234570', role: 'ADMIN' as const, cnic: '9999900000001', medIntelCode: null },
    { name: 'Clinic Admin', email: CLINIC_EMAIL, phone: '+923001234571', role: 'CLINIC_ADMIN' as const, cnic: '9999900000002', medIntelCode: null },
    { name: 'Demo Patient', email: DEMO_PATIENT_EMAIL, phone: '+923001112222', role: 'PATIENT' as const, cnic: '1111122223333', medIntelCode: 'MED-PK-DEMO-P' },
  ]

  for (const u of nonDoctors) {
    const fixedId = `seed-user-${slug(u.name)}`
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, phone: u.phone, passwordHash, role: u.role, cnicNumber: u.cnic, medIntelCode: u.medIntelCode },
      create: {
        id: fixedId, email: u.email, phone: u.phone, passwordHash,
        name: u.name, role: u.role,
        cnicNumber: u.cnic, medIntelCode: u.medIntelCode,
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
        emailVerified: new Date(),
      },
    })
    map[u.email] = user.id
  }

  // Seed doctors (12 + 1 demo)
  for (const d of DEMO_DOCTORS) {
    const user = await prisma.user.upsert({
      where:  { email: d.email },
      update: { name: d.name, phone: d.phone, passwordHash, role: 'DOCTOR' },
      create: {
        id: d.userId, email: d.email, phone: d.phone, passwordHash,
        name: d.name, role: 'DOCTOR',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
        emailVerified: new Date(),
      },
    })
    map[d.email] = user.id
  }

  // Existing demo doctor (legacy)
  await prisma.user.upsert({
    where:  { email: DEMO_DOCTOR_EMAIL },
    update: {},
    create: {
      email: DEMO_DOCTOR_EMAIL, phone: '+923004445555', passwordHash,
      name: 'Dr. Demo Specialist', role: 'DOCTOR',
      medIntelCode: 'MED-PK-DEMO-D',
      kycStatus: 'VERIFIED', kycVerifiedAt: new Date(),
      emailVerified: new Date(),
    },
  })

  console.log(`  ✔ ${nonDoctors.length + DEMO_DOCTORS.length + 1} users (${PATIENTS.length} patients, ${DEMO_DOCTORS.length + 1} doctors, 1 admin, 1 clinic admin)`)
  return map
}

// ── Doctors ───────────────────────────────────────────────────────────────────

async function seedDoctors(passwordHash: string, userMap: Record<string, string>) {
  const map: Record<string, string> = {} // email -> doctor id

  for (const d of DEMO_DOCTORS) {
    const userId = d.userId
    await prisma.doctor.upsert({
      where:  { id: d.id },
      update: {
        specialization: d.specialization, consultationFee: d.fee,
        yearsExperience: d.years, rating: d.rating, reviewCount: d.reviews,
        trustBadge: d.trust, bio: d.bio,
        kydStatus: 'VERIFIED', isOnline: d.isOnline, lastSeenAt: d.isOnline ? new Date() : undefined,
      },
      create: {
        id: d.id, userId, licenseNumber: d.licenseNumber,
        specialization: d.specialization, consultationFee: d.fee,
        qualifications: qs([d.bio.split('·')[0].trim()]),
        yearsExperience: d.years, bio: d.bio,
        rating: d.rating, reviewCount: d.reviews, trustBadge: d.trust,
        tier: d.tier, isOnline: d.isOnline, lastSeenAt: d.isOnline ? new Date() : undefined,
        kydStatus: 'VERIFIED',
        kydTier1At: new Date(), kydTier2At: new Date(), kydTier3At: new Date(),
        availability: jf({ days: [1, 2, 3, 4, 5, 6], startHour: 9, endHour: 18, timezone: 'Asia/Karachi' }),
      },
    })
    map[d.email] = d.id
  }

  // Legacy demo doctor
  const demoUser = await prisma.user.findUnique({ where: { email: DEMO_DOCTOR_EMAIL } })
  if (demoUser) {
    await prisma.doctor.upsert({
      where:  { userId: demoUser.id },
      update: { isOnline: true, lastSeenAt: new Date() },
      create: {
        userId: demoUser.id, licenseNumber: 'PMDC-DEMO-001',
        specialization: 'General Medicine',
        qualifications: qs(['MBBS', 'FCPS']),
        yearsExperience: 12, bio: 'Demo physician for the MedIntel MVP.',
        consultationFee: 1500, stripeAccountId: 'acct_demo_placeholder',
        kydStatus: 'VERIFIED',
        kydTier1At: new Date(), kydTier2At: new Date(), kydTier3At: new Date(),
        trustBadge: true, rating: 4.8, reviewCount: 42,
        isOnline: true, lastSeenAt: new Date(),
        tier: 'SENIOR',
        availability: jf({ days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, timezone: 'Asia/Karachi' }),
      },
    })
    map[DEMO_DOCTOR_EMAIL] = (await prisma.doctor.findUnique({ where: { userId: demoUser.id } }))!.id
  }

  console.log(`  ✔ ${DEMO_DOCTORS.length + 1} doctors (${DEMO_DOCTORS.filter(d => d.isOnline).length + 1} online)`)
  return map
}

// ── Patients ──────────────────────────────────────────────────────────────────

async function seedPatients(userMap: Record<string, string>) {
  const map: Record<string, string> = {} // email -> patient id

  for (const p of PATIENTS) {
    const userId = userMap[p.email]
    if (!userId) throw new Error(`Missing user for ${p.email}`)
    await prisma.patient.upsert({
      where:  { userId },
      update: {},
      create: {
        userId, dateOfBirth: p.dob, gender: p.gender,
        address: p.address, emergencyContact: p.emergencyContact,
      },
    })
    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw new Error(`Patient not created for ${p.email}`)
    map[p.email] = patient.id
  }

  // Demo patient
  const demoUserId = userMap[DEMO_PATIENT_EMAIL]
  if (demoUserId) {
    await prisma.patient.upsert({
      where:  { userId: demoUserId },
      update: {},
      create: {
        userId: demoUserId, dateOfBirth: new Date('1995-01-01'),
        gender: 'OTHER', address: 'Lahore, Pakistan', emergencyContact: '+923009998888',
      },
    })
    const demoPatient = await prisma.patient.findUnique({ where: { userId: demoUserId } })
    if (demoPatient) map[DEMO_PATIENT_EMAIL] = demoPatient.id
  }

  console.log(`  ✔ ${Object.keys(map).length} patients`)
  return map
}

// ── Medical Records ───────────────────────────────────────────────────────────

async function seedMedicalRecords(patientMap: Record<string, string>) {
  let count = 0
  for (const p of PATIENTS) {
    const patientId = patientMap[p.email]
    if (!patientId) continue
    for (const r of p.records) {
      const id = `seed-record-${slug(p.name)}-${slug(r.type)}`
      await prisma.medicalRecord.upsert({
        where:  { id },
        update: {},
        create: {
          id, patientId, type: r.type, title: r.title,
          content: r.content, recordedAt: new Date(NOW.getTime() - 30 * MS),
        },
      })
      count++
    }
  }
  // Demo patient's existing records
  const demoPatientId = patientMap[DEMO_PATIENT_EMAIL]
  if (demoPatientId) {
    const demoRecords = [
      { id: 'seed-record-allergy', type: 'ALLERGY', title: 'Penicillin allergy', content: 'Severe rash with penicillin-class antibiotics. Use macrolides instead.', recordedAt: new Date(NOW.getTime() - 90 * MS) },
      { id: 'seed-record-chronic-htn', type: 'CHRONIC_MED', title: 'Hypertension — Amlodipine 5mg', content: 'Daily 5mg amlodipine since 2024. BP usually 130/85.', recordedAt: new Date(NOW.getTime() - 60 * MS) },
    ]
    for (const r of demoRecords) {
      await prisma.medicalRecord.upsert({
        where:  { id: r.id },
        update: {},
        create: { ...r, patientId: demoPatientId },
      })
      count++
    }
  }
  console.log(`  ✔ ${count} medical records`)
}

// ── Triages ───────────────────────────────────────────────────────────────────

async function seedTriages(patientMap: Record<string, string>) {
  let count = 0
  for (const t of TRIAGES) {
    const patientId = patientMap[t.patientEmail]
    if (!patientId) continue
    await prisma.triage.upsert({
      where:  { id: t.id },
      update: {},
      create: {
        id: t.id, patientId,
        transcript: t.transcript, summary: t.summary,
        severityScore: t.severityScore, severityLevel: t.severityLevel,
        department: t.department,
        createdAt: new Date(NOW.getTime() - t.minutesAgo * 60 * 1000),
      },
    })
    count++
  }
  console.log(`  ✔ ${count} triages`)
}

// ── Appointments ──────────────────────────────────────────────────────────────

async function seedAppointments(patientMap: Record<string, string>, doctorMap: Record<string, string>) {
  const map: Record<string, string> = {}

  for (const a of APPTS) {
    const patientId = patientMap[a.patientEmail]
    const doctorPk = doctorMap[a.doctorId] ?? a.doctorId // doctorMap keyed by email, but we use doctorId directly
    if (!patientId) continue

    const scheduledAt = new Date(NOW.getTime() + a.scheduledOffset)

    await prisma.appointment.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id: a.id, patientId,
        doctorId: a.doctorId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: a.status as any,
        scheduledAt,
        completedAt: a.completedOffset ? new Date(NOW.getTime() + a.completedOffset) : undefined,
        cancelledAt: a.cancelledOffset ? new Date(NOW.getTime() + a.cancelledOffset) : undefined,
        transcript: a.transcript, aiSummary: a.aiSummary,
        severityScore: a.severityScore,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severityLevel: a.severityLevel as any,
        department: a.department,
        prescriptionText: a.prescriptionText,
        cancellationReason: a.cancellationReason,
        cancelledBy: a.cancelledBy,
        recordingConsentAt: a.consentOffset ? new Date(NOW.getTime() + a.consentOffset) : undefined,
        reminderSentAt: a.reminderOffset ? new Date(NOW.getTime() + a.reminderOffset) : undefined,
      },
    })
    map[a.id] = a.id
  }

  // Keep existing demo appointments
  const demoPatientId = patientMap[DEMO_PATIENT_EMAIL]
  const demoDoctor = await prisma.doctor.findFirst({ where: { userId: { not: undefined } } })
  if (demoPatientId) {
    // Re-create existing demo appointments if they don't exist
    const existingIds = await prisma.appointment.findMany({ where: { id: { startsWith: 'seed-appt-' } }, select: { id: true } })
    const existingSet = new Set(existingIds.map(e => e.id))

    const demoAppts = [
      { id: 'seed-appt-completed', status: 'COMPLETED' as const, scheduledOffset: -7 * MS, completedOffset: -7 * MS + 30 * 60 * 1000 },
      { id: 'seed-appt-inprogress', status: 'IN_PROGRESS' as const, scheduledOffset: -15 * 60 * 1000 },
      { id: 'seed-appt-scheduled', status: 'SCHEDULED' as const, scheduledOffset: 2 * MS },
    ]
    for (const da of demoAppts) {
      if (existingSet.has(da.id)) continue
      const doctor = await prisma.doctor.findFirst({ where: { specialization: 'General Medicine' } })
      if (!doctor) continue
      await prisma.appointment.upsert({
        where: { id: da.id },
        update: {},
        create: {
          id: da.id, patientId: demoPatientId, doctorId: doctor.id,
          status: da.status,
          scheduledAt: new Date(NOW.getTime() + da.scheduledOffset),
          completedAt: da.completedOffset ? new Date(NOW.getTime() + da.completedOffset) : undefined,
        },
      })
    }
  }

  console.log(`  ✔ ${APPTS.length + 3} appointments (COMPLETED ×2, IN_PROGRESS ×2, SCHEDULED ×2, CANCELLED ×1)`)
  return map
}

// ── Consultation Notes ────────────────────────────────────────────────────────

async function seedNotes(apptMap: Record<string, string>) {
  let count = 0
  for (const n of NOTES) {
    if (!apptMap[n.appointmentId]) continue
    await prisma.consultationNote.upsert({
      where:  { appointmentId: n.appointmentId },
      update: {},
      create: {
        appointmentId: n.appointmentId,
        transcript: n.subjective,
        subjective: n.subjective, objective: n.objective,
        assessment: n.assessment, plan: n.plan,
        icdHints: qs(n.icdHints),
        language: n.language, modelUsed: n.modelUsed,
        approvedAt: new Date(), approvedBy: 'seed-system',
      },
    })
    count++
  }
  console.log(`  ✔ ${count} consultation notes (SOAP format)`)
}

// ── Escrow ────────────────────────────────────────────────────────────────────

async function seedEscrow(apptMap: Record<string, string>) {
  const escrows = [
    { apptId: 'seed-appt-mohammad-completed', amount: 3000, status: 'RELEASED' as const, heldOffset: -8 * MS - 5 * 60 * 1000, releasedOffset: -8 * MS + 50 * 60 * 1000, pi: 'pi_seed_nstemi_001' },
    { apptId: 'seed-appt-fatima-completed', amount: 2800, status: 'RELEASED' as const, heldOffset: -3 * MS - 5 * 60 * 1000, releasedOffset: -3 * MS + 35 * 60 * 1000, pi: 'pi_seed_migraine_001' },
    { apptId: 'seed-appt-zainab-cancelled', amount: 1800, status: 'REFUNDED' as const, heldOffset: -1 * MS - 4 * 60 * 60 * 1000, refundedOffset: -1 * MS - 2 * 60 * 60 * 1000, pi: 'pi_seed_derm_001', refundReason: 'Patient cancelled — symptoms resolved' },
    { apptId: 'seed-appt-ahmed-scheduled', amount: 2400, status: 'HELD' as const, heldOffset: -1 * MS, pi: 'pi_seed_gastro_001' },
    { apptId: 'seed-appt-sara-inprogress', amount: 2200, status: 'HELD' as const, heldOffset: -15 * 60 * 1000 - 60 * 1000, pi: 'pi_seed_ortho_001' },
  ]

  // Demo appt escrow
  const demoAppt = await prisma.appointment.findUnique({ where: { id: 'seed-appt-completed' } })
  if (demoAppt) {
    escrows.push({ apptId: 'seed-appt-completed', amount: 1500, status: 'RELEASED', heldOffset: -7 * MS - 60 * 1000, releasedOffset: -7 * MS + 30 * 60 * 1000, pi: 'pi_demo_completed_001' })
  }

  let count = 0
  for (const e of escrows) {
    if (!apptMap[e.apptId] && e.apptId !== 'seed-appt-completed') continue
    const heldAt = new Date(NOW.getTime() + e.heldOffset)
    await prisma.escrow.upsert({
      where:  { appointmentId: e.apptId },
      update: {},
      create: {
        appointmentId: e.apptId, amount: e.amount, currency: 'PKR',
        status: e.status, provider: 'stripe',
        stripePaymentIntentId: e.pi,
        heldAt,
        releasedAt: e.releasedOffset ? new Date(NOW.getTime() + e.releasedOffset) : undefined,
        refundedAt: 'refundedOffset' in e && e.refundedOffset ? new Date(NOW.getTime() + e.refundedOffset) : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
refundReason: (e as any).refundReason,
      },
    })
    count++
  }
  console.log(`  ✔ ${count} escrow records (${escrows.filter(e => e.status === 'HELD').length} HELD, ${escrows.filter(e => e.status === 'RELEASED').length} RELEASED, ${escrows.filter(e => e.status === 'REFUNDED').length} REFUNDED)`)
}

// ── Reviews ───────────────────────────────────────────────────────────────────

async function seedReviews(patientMap: Record<string, string>, doctorMap: Record<string, string>) {
  let count = 0
  for (const r of REVIEWS) {
    const patientId = patientMap[r.patientEmail]
    if (!patientId) continue
    await prisma.review.upsert({
      where:  { appointmentId: r.appointmentId },
      update: {},
      create: {
        appointmentId: r.appointmentId, patientId,
        doctorId: r.doctorId, rating: r.rating, comment: r.comment,
      },
    })
    count++
  }
  console.log(`  ✔ ${count} reviews`)
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function seedNotifications(userMap: Record<string, string>, doctorMap: Record<string, string>) {
  const notifs: Array<{ userId: string; category: string; title: string; body: string; href?: string; createdAt: Date; readAt?: Date }> = []

  const now = Date.now()
  const ago = (min: number) => new Date(now - min * 60 * 1000)
  const future = (min: number) => new Date(now + min * 60 * 1000)

  // Patient notifications
  for (const [email, uid] of Object.entries(userMap)) {
    if (!PATIENTS.some(p => p.email === email) && email !== DEMO_PATIENT_EMAIL) continue
    if (email === 'fatima@demo.medintel.app') {
      notifs.push({ userId: uid, category: 'escrow', title: 'Payment confirmed', body: 'Your payment of PKR 2,800 for Dr. Bilal Hashmi has been processed.', createdAt: ago(3 * 24 * 60 + 5) })
      notifs.push({ userId: uid, category: 'prescription', title: 'Prescription available', body: 'Dr. Bilal Hashmi has prescribed Sumatriptan and Propranolol. View your prescription in the appointment details.', href: '/history', createdAt: ago(3 * 24 * 60 - 10), readAt: ago(3 * 24 * 60 - 30) })
      notifs.push({ userId: uid, category: 'appointment', title: 'Upcoming appointment', body: 'Your follow-up with Dr. Bilal Hashmi is in 2 days.', createdAt: ago(12 * 60) })
    }
    if (email === 'ali@demo.medintel.app') {
      notifs.push({ userId: uid, category: 'appointment', title: 'Urgent: Appointment completed', body: 'Your consultation with Dr. Salman Zafar is complete. Please follow the prescribed treatment plan and visit a cardiologist for follow-up.', href: '/history', createdAt: ago(5 * 24 * 60 + 10) })
      notifs.push({ userId: uid, category: 'escrow', title: 'Payment released', body: 'PKR 3,000 has been released to Dr. Salman Zafar for your completed consultation.', createdAt: ago(5 * 24 * 60 + 5) })
    }
    if (email === 'zainab@demo.medintel.app') {
      notifs.push({ userId: uid, category: 'escrow', title: 'Refund processed', body: 'Your payment of PKR 1,800 has been refunded as per cancellation policy.', createdAt: ago(2 * 24 * 60 + 2) })
    }
    if (email === 'ahmed@demo.medintel.app') {
      notifs.push({ userId: uid, category: 'appointment', title: 'Appointment confirmed', body: 'Your appointment with Dr. Usman Raza is scheduled for 3 days from now.', href: '/history', createdAt: ago(24 * 60 + 10), readAt: ago(23 * 60) })
    }
    if (email === 'sara@demo.medintel.app') {
      notifs.push({ userId: uid, category: 'appointment', title: 'Consultation in progress', body: 'Your consultation with Dr. Sana Malik has started.', createdAt: ago(10) })
    }
  }

  // Doctor notifications
  for (const [email, did] of Object.entries(doctorMap)) {
    if (email === 'bilal@demo.medintel.app') {
      const uid = userMap['fatima@demo.medintel.app']
      if (uid) {
        notifs.push({ userId: uid, category: 'system', title: 'New patient assigned', body: 'Fatima Ahmed has booked a consultation with you. Migraine assessment.', createdAt: ago(3 * 24 * 60 + 60) })
        notifs.push({ userId: uid, category: 'escrow', title: 'Escrow released', body: 'Payment of PKR 2,800 has been released to your account for consultation with Fatima Ahmed.', createdAt: ago(3 * 24 * 60 - 5) })
      }
    }
    if (email === 'salman@demo.medintel.app') {
      const uid = userMap['ali@demo.medintel.app']
      if (uid) {
        notifs.push({ userId: uid, category: 'system', title: 'Urgent: High-acuity patient assigned', body: 'Mohammad Ali — NSTEMI suspected. Immediate consultation required.', createdAt: ago(8 * 24 * 60 + 30) })
        notifs.push({ userId: uid, category: 'escrow', title: 'Escrow released', body: 'Payment of PKR 3,000 released for NSTEMI consultation.', createdAt: ago(5 * 24 * 60 - 5) })
      }
    }
  }

  // Admin notification
  const adminUid = userMap[ADMIN_EMAIL]
  if (adminUid) {
    notifs.push({ userId: adminUid, category: 'system', title: 'New doctor KYD pending', body: '2 new doctors are pending KYD verification. Review their documents.', href: '/admin/doctors', createdAt: ago(60) })
  }

  let count = 0
  for (const n of notifs) {
    const id = `seed-notif-${slug(n.userId + '-' + n.title.slice(0, 20))}-${count}`
    await prisma.notification.upsert({
      where: { id },
      update: {},
      create: { id, ...n },
    })
    count++
  }
  console.log(`  ✔ ${notifs.length} notifications`)
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

async function seedAuditLog(userMap: Record<string, string>) {
  const entries: AuditSeed[] = [
    { actorRole: 'SYSTEM', action: 'user.register', entityType: 'User', entityId: userMap['fatima@demo.medintel.app'] ?? 'seed-user-fatima-ahmed' },
    { actorRole: 'SYSTEM', action: 'user.register', entityType: 'User', entityId: userMap['ali@demo.medintel.app'] ?? 'seed-user-mohammad-ali' },
    { actorRole: 'SYSTEM', action: 'user.register', entityType: 'User', entityId: userMap['zainab@demo.medintel.app'] ?? 'seed-user-zainab-khan' },
    { actorRole: 'SYSTEM', action: 'user.register', entityType: 'User', entityId: userMap['ahmed@demo.medintel.app'] ?? 'seed-user-ahmed-raza' },
    { actorRole: 'SYSTEM', action: 'user.register', entityType: 'User', entityId: userMap['sara@demo.medintel.app'] ?? 'seed-user-sara-bibi' },
    { actorRole: 'SYSTEM', action: 'kyc.verify', entityType: 'User', entityId: userMap['fatima@demo.medintel.app'] ?? 'seed-user-fatima-ahmed', metadata: { status: 'VERIFIED' } },
    { actorRole: 'SYSTEM', action: 'kyc.verify', entityType: 'User', entityId: userMap['ali@demo.medintel.app'] ?? 'seed-user-mohammad-ali', metadata: { status: 'VERIFIED' } },
    { actorRole: 'SYSTEM', action: 'kyd.approve', entityType: 'Doctor', entityId: 'seed-doctor-salman-zafar', metadata: { tier: 'SENIOR' } },
    { actorRole: 'SYSTEM', action: 'kyd.approve', entityType: 'Doctor', entityId: 'seed-doctor-bilal-hashmi', metadata: { tier: 'SENIOR' } },
    { actorRole: 'SYSTEM', action: 'kyd.approve', entityType: 'Doctor', entityId: 'seed-doctor-sana-malik', metadata: { tier: 'JUNIOR' } },
    { actorRole: 'PATIENT', action: 'appointment.book', entityType: 'Appointment', entityId: 'seed-appt-mohammad-completed', metadata: { doctorId: 'seed-doctor-salman-zafar', amount: 3000 } },
    { actorRole: 'PATIENT', action: 'appointment.book', entityType: 'Appointment', entityId: 'seed-appt-fatima-completed', metadata: { doctorId: 'seed-doctor-bilal-hashmi', amount: 2800 } },
    { actorRole: 'PATIENT', action: 'appointment.book', entityType: 'Appointment', entityId: 'seed-appt-zainab-cancelled', metadata: { doctorId: 'seed-doctor-fawad-akbar', amount: 1800 } },
    { actorRole: 'PATIENT', action: 'appointment.book', entityType: 'Appointment', entityId: 'seed-appt-ahmed-scheduled', metadata: { doctorId: 'seed-doctor-usman-raza', amount: 2400 } },
    { actorRole: 'PATIENT', action: 'appointment.book', entityType: 'Appointment', entityId: 'seed-appt-sara-inprogress', metadata: { doctorId: 'seed-doctor-sana-malik', amount: 2200 } },
    { actorRole: 'PATIENT', action: 'appointment.cancel', entityType: 'Appointment', entityId: 'seed-appt-zainab-cancelled', metadata: { reason: 'Symptoms resolved' } },
    { actorRole: 'SYSTEM', action: 'escrow.release', entityType: 'Appointment', entityId: 'seed-appt-mohammad-completed', metadata: { amount: 3000 } },
    { actorRole: 'SYSTEM', action: 'escrow.release', entityType: 'Appointment', entityId: 'seed-appt-fatima-completed', metadata: { amount: 2800 } },
    { actorRole: 'SYSTEM', action: 'escrow.refund', entityType: 'Appointment', entityId: 'seed-appt-zainab-cancelled', metadata: { amount: 1800, reason: 'Patient cancellation' } },
    { actorRole: 'DOCTOR', action: 'prescription.upload', entityType: 'Appointment', entityId: 'seed-appt-mohammad-completed', metadata: { doctorId: 'seed-doctor-salman-zafar' } },
    { actorRole: 'DOCTOR', action: 'prescription.upload', entityType: 'Appointment', entityId: 'seed-appt-fatima-completed', metadata: { doctorId: 'seed-doctor-bilal-hashmi' } },
  ]

  let count = 0
  for (const e of entries) {
    const id = `seed-audit-${count}`
    await prisma.auditLog.upsert({
      where: { id },
      update: {},
      create: {
        id, actorId: e.actorId, actorRole: e.actorRole,
        action: e.action, entityType: e.entityType, entityId: e.entityId,
        metadata: e.metadata ? jf(e.metadata) : undefined,
        createdAt: new Date(NOW.getTime() - (entries.length - count) * 60 * 60 * 1000),
      },
    })
    count++
  }
  console.log(`  ✔ ${entries.length} audit log entries`)
}

// ── Research Insights ─────────────────────────────────────────────────────────

async function seedResearch() {
  const insights: ResearchSeed[] = [
    {
      windowDays: 7,
      totalCases: 142,
      avgSeverity: 3.8,
      summary: 'Triage analysis for the week ending June 14, 2026. General Medicine and Cardiology accounted for 45% of all cases. Notable increase in respiratory complaints coinciding with seasonal humidity shifts. Average severity score decreased slightly from 4.1 to 3.8, suggesting earlier intervention seeking behaviour.',
      keyFindings: ['Cardiology cases show higher-than-average severity (6.2 vs 3.8 overall)', 'Respiratory complaints up 18% week-over-week', 'Weekend triage volume 2.1× weekday average'],
      topDiseases: { 'Hypertension': 28, 'URTI': 24, 'Migraine': 18, 'GERD': 15, 'Diabetes follow-up': 12 },
      modelUsed: 'seed-data',
    },
    {
      windowDays: 30,
      totalCases: 587,
      avgSeverity: 4.0,
      summary: 'Monthly triage trends: Cardiology and Neurology cases consistently score higher severity (6.5+), while Dermatology and General Medicine route predominantly to ROUTINE. Patient demographics show even gender split, with 35-50 age group contributing the most triage volume.',
      keyFindings: ['Top 3 departments account for 52% of all triages', 'CRITICAL cases are 8% of total but consume 22% of consult time', 'Morning triages (6am-12pm) skew 30% more urgent than evening'],
      topDiseases: { 'Hypertension': 89, 'Migraine': 67, 'URTI': 62, 'Lower back pain': 48, 'Diabetes': 41 },
      modelUsed: 'seed-data',
    },
    {
      windowDays: 90,
      totalCases: 1723,
      avgSeverity: 3.9,
      summary: 'Quarterly analysis: Seasonal patterns emerging — allergy/respiratory cases peak in March-April and September-October. Cardiology volumes steady throughout quarter suggesting chronic disease burden rather than seasonal triggers.',
      keyFindings: ['Readmission rate (same complaint within 30 days): 6.7%', 'Weekend-to-weekday severity differential persists across all departments', 'Patient satisfaction inversely correlated with wait time (r = -0.42)'],
      topDiseases: { 'Hypertension': 245, 'URTI': 188, 'Migraine': 156, 'GERD': 132, 'Diabetes': 118 },
      modelUsed: 'seed-data',
    },
  ]

  let count = 0
  for (const ins of insights) {
    const id = `seed-insight-${ins.windowDays}d`
    await prisma.researchInsight.upsert({
      where: { id },
      update: {},
      create: {
        id, windowDays: ins.windowDays, totalCases: ins.totalCases,
        avgSeverity: ins.avgSeverity, summary: ins.summary,
        keyFindings: qs(ins.keyFindings),
        topDiseases: jf(ins.topDiseases), modelUsed: ins.modelUsed,
        generatedAt: new Date(NOW.getTime() - count * 7 * MS),
      },
    })
    count++
  }
  console.log(`  ✔ ${insights.length} research insights`)
}

// ── Clinic ────────────────────────────────────────────────────────────────────

async function seedClinic(userMap: Record<string, string>, doctorMap: Record<string, string>) {
  const ownerId = userMap[CLINIC_EMAIL]
  if (!ownerId) {
    console.log('  ⚠ Clinic admin user not found, skipping clinic seed')
    return
  }

  await prisma.clinic.upsert({
    where:  { slug: 'lahore-care-clinic' },
    update: {},
    create: {
      id: 'seed-clinic-lahore-care', name: 'Lahore Care Clinic',
      slug: 'lahore-care-clinic', ownerUserId: ownerId,
      plan: 'STANDARD', minutesQuota: 5000, minutesUsed: 1280,
      whatsappNumber: '+923000011111', voiceNumber: '+923000022222',
      brandColor: '#2563eb', active: true,
      stripeCustomerId: 'cus_seed_lcc_001',
      currentPeriodEnd: new Date(NOW.getTime() + 20 * MS),
    },
  })

  // Assign 3 existing doctors to the clinic
  const clinicDoctors = ['seed-doctor-rabia-naseer', 'seed-doctor-maria-khan', 'seed-doctor-hina-shah']
  for (const did of clinicDoctors) {
    const doctor = await prisma.doctor.findUnique({ where: { id: did } })
    if (doctor) {
      await prisma.doctor.update({
        where: { id: did },
        data: { clinicId: 'seed-clinic-lahore-care' },
      })
    }
  }

  // Clinic usage records
  const channels = ['whatsapp', 'voice', 'web', 'scribe'] as const
  let usageCount = 0
  for (let day = 0; day < 14; day++) {
    for (const ch of channels) {
      const id = `seed-usage-lcc-${ch}-${day}`
      await prisma.clinicUsage.upsert({
        where: { id },
        update: {},
        create: {
          id, clinicId: 'seed-clinic-lahore-care',
          channel: ch, minutes: Math.floor(Math.random() * 45) + 5,
          createdAt: new Date(NOW.getTime() - day * MS),
        },
      })
      usageCount++
    }
  }

  // Clinic invite
  await prisma.clinicInvite.upsert({
    where: { id: 'seed-invite-lcc-ashraf' },
    update: {},
    create: {
      id: 'seed-invite-lcc-ashraf', clinicId: 'seed-clinic-lahore-care',
      email: 'dr.ashraf@demo.medintel.app', token: 'seed-invite-token-ashraf',
      role: 'DOCTOR',
      expiresAt: new Date(NOW.getTime() + 30 * MS),
      invitedBy: ownerId,
      createdAt: new Date(NOW.getTime() - MS),
    },
  })

  console.log(`  ✔ 1 clinic, ${clinicDoctors.length} clinic doctors, ${usageCount} usage records, 1 pending invite`)
}

// ── Execute ───────────────────────────────────────────────────────────────────

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
