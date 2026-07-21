import { createHash } from 'node:crypto'

export type ClinicRole = 'ADMIN' | 'RECEPTIONIST' | 'HYGIENIST' | 'DENTIST'
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED'

export interface SafetyInput {
  allergies?: string[]
  conditions?: string[]
  medications?: string[]
  proposedTreatment: string
  proposedMedications?: string[]
  hasVerifiedIdentity: boolean
  hasActiveConsent: boolean
}

const interactionRules = [
  { patient: /penicillin|amoxicillin/i, proposed: /amoxicillin|penicillin|augmentin/i, reason: 'Documented beta-lactam allergy conflicts with proposed medication.' },
  { patient: /warfarin|apixaban|rivaroxaban|clopidogrel|anticoagul/i, proposed: /extract|surgery|implant|incision/i, reason: 'Bleeding-risk medication requires a peri-procedural plan.' },
  { patient: /pregnan/i, proposed: /tetracycline|doxycycline/i, reason: 'Proposed tetracycline-class medication requires pregnancy safety review.' },
  { patient: /kidney|renal/i, proposed: /ibuprofen|naproxen|nsaid/i, reason: 'NSAID use requires review for documented renal disease.' },
]

export function normalizeIdentity(identifier: string, birthDate: string) {
  return `${identifier.trim().toLowerCase()}|${birthDate.trim()}`
}

export function identityMatchKey(identifier: string, birthDate: string) {
  return createHash('sha256').update(normalizeIdentity(identifier, birthDate)).digest('hex')
}

export function evaluateSafety(input: SafetyInput) {
  const patientFacts = [...(input.allergies ?? []), ...(input.conditions ?? []), ...(input.medications ?? [])]
  const proposal = [input.proposedTreatment, ...(input.proposedMedications ?? [])].join(' ')
  const contraindications = interactionRules
    .filter((rule) => patientFacts.some((fact) => rule.patient.test(fact)) && rule.proposed.test(proposal))
    .map((rule) => rule.reason)
  const missingData: string[] = []
  if (!input.hasVerifiedIdentity) missingData.push('verified identity')
  if (!input.hasActiveConsent) missingData.push('active clinical-data consent')
  if (!input.allergies) missingData.push('allergy status')
  if (!input.medications) missingData.push('medication list')

  const riskLevel: RiskLevel = contraindications.length > 0
    ? 'CRITICAL'
    : missingData.length > 1
      ? 'HIGH'
      : missingData.length === 1
        ? 'MODERATE'
        : 'LOW'

  return {
    riskLevel,
    contraindications,
    missingData,
    mustEscalate: riskLevel === 'CRITICAL' || riskLevel === 'HIGH',
  }
}

export function canReadClinicalData(role: ClinicRole) {
  return role === 'ADMIN' || role === 'DENTIST' || role === 'HYGIENIST'
}

export function canRecordIntake(role: ClinicRole) {
  return role === 'ADMIN' || role === 'RECEPTIONIST' || role === 'DENTIST' || role === 'HYGIENIST'
}

export function authorizeDecision(input: {
  role: ClinicRole
  actorId: string
  createdById: string
  riskLevel: RiskLevel
  decision: Exclude<ReviewStatus, 'PENDING_REVIEW'>
}) {
  if (!canReadClinicalData(input.role)) return { allowed: false, reason: 'A clinical role is required.' }
  if (input.actorId === input.createdById) return { allowed: false, reason: 'Independent review is required.' }
  if ((input.riskLevel === 'HIGH' || input.riskLevel === 'CRITICAL') && input.role !== 'DENTIST') {
    return { allowed: false, reason: 'High-risk decisions require a dentist.' }
  }
  if (input.decision === 'APPROVED' && (input.riskLevel === 'HIGH' || input.riskLevel === 'CRITICAL')) {
    return { allowed: false, reason: 'High-risk output must be escalated or rejected, not approved.' }
  }
  return { allowed: true as const }
}

export function redactPatient<T extends Record<string, unknown>>(patient: T, role: ClinicRole) {
  if (canReadClinicalData(role)) return patient
  const { medicalHistory: _medicalHistory, notes: _notes, insurancePolicyNo: _policy, insuranceGroupNo: _group, ...safe } = patient
  return safe
}
