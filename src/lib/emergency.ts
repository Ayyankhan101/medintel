export interface FirstAidInstruction {
  department: string
  audio: string
  steps: string[]
}

const INSTRUCTIONS: Record<string, FirstAidInstruction> = {
  Cardiology: {
    department: 'Cardiology',
    audio: 'This is a serious condition. If available, take one tablet of Aspirin 300mg immediately and sit down. Do not walk. Call emergency services now.',
    steps: [
      'Sit or lie down — do not walk or exert yourself.',
      'Chew 1 tablet of Aspirin 300 mg (if not allergic).',
      'Loosen any tight clothing around your chest.',
      'Call 1122 or the nearest emergency number immediately.',
      'Stay calm and breathe slowly until help arrives.',
    ],
  },
  Neurology: {
    department: 'Neurology',
    audio: 'Possible neurological emergency. Lay the patient on their side, do not give food or water, and call emergency services immediately.',
    steps: [
      'Lay patient on their side (recovery position).',
      'Clear area of hard objects to prevent injury.',
      'Do not insert anything in the mouth.',
      'Time the episode if possible.',
      'Call 1122 immediately.',
    ],
  },
  Pulmonology: {
    department: 'Pulmonology',
    audio: 'Severe breathing difficulty detected. Sit the patient upright, use any prescribed inhaler, and seek emergency care now.',
    steps: [
      'Sit patient upright — do not lie flat.',
      'Use prescribed bronchodilator inhaler if available.',
      'Loosen clothing around the neck and chest.',
      'Call 1122 if breathing does not improve in 5 minutes.',
    ],
  },
  default: {
    department: 'General',
    audio: 'A serious medical condition has been detected. Please seek emergency care immediately and do not drive yourself.',
    steps: [
      'Stay calm and do not exert yourself.',
      'Call a family member or emergency services.',
      'Do not eat or drink until evaluated by a doctor.',
      'Call 1122 for emergency assistance.',
    ],
  },
}

export function getEmergencyInstructions(department: string): FirstAidInstruction {
  return INSTRUCTIONS[department] ?? INSTRUCTIONS.default
}

export function isEmergencyScore(score: number): boolean {
  return score >= 8
}

export function buildNearbyHospitalQuery(lat: number, lng: number, keyword = 'hospital emergency'): string {
  const params = new URLSearchParams({
    location:  `${lat},${lng}`,
    radius:    '10000',
    keyword,
    type:      'hospital',
    key:       process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  })
  return `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
}
