import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authorizeDecision, canReadClinicalData, evaluateSafety, identityMatchKey, redactPatient } from '../../lib/clinical-policy'

describe('clinical safety policy', () => {
  it('creates stable, non-plaintext identity keys', () => {
    const key = identityMatchKey(' MRN-42 ', '1980-01-01')
    assert.equal(key, identityMatchKey('mrn-42', '1980-01-01'))
    assert.equal(key.length, 64)
    assert.equal(key.includes('MRN-42'), false)
  })
  it('flags a documented penicillin contraindication as critical', () => {
    const result = evaluateSafety({ allergies: ['Penicillin'], medications: [], proposedTreatment: 'Prescribe amoxicillin', proposedMedications: ['amoxicillin'], hasVerifiedIdentity: true, hasActiveConsent: true })
    assert.equal(result.riskLevel, 'CRITICAL')
    assert.equal(result.mustEscalate, true)
    assert.equal(result.contraindications.length, 1)
  })
  it('flags anticoagulant and extraction interaction', () => {
    const result = evaluateSafety({ allergies: [], medications: ['apixaban'], proposedTreatment: 'Dental extraction', hasVerifiedIdentity: true, hasActiveConsent: true })
    assert.equal(result.riskLevel, 'CRITICAL')
  })
  it('escalates missing allergy and medication data', () => {
    const result = evaluateSafety({ proposedTreatment: 'Routine cleaning', hasVerifiedIdentity: true, hasActiveConsent: true })
    assert.equal(result.riskLevel, 'HIGH')
    assert.deepEqual(result.missingData, ['allergy status', 'medication list'])
  })
  it('reports low risk only when required data and governance are present', () => {
    const result = evaluateSafety({ allergies: [], medications: [], conditions: [], proposedTreatment: 'Routine cleaning', hasVerifiedIdentity: true, hasActiveConsent: true })
    assert.equal(result.riskLevel, 'LOW')
    assert.equal(result.mustEscalate, false)
  })
  it('prevents the author approving their own output', () => {
    assert.equal(authorizeDecision({ role: 'DENTIST', actorId: 'u1', createdById: 'u1', riskLevel: 'LOW', decision: 'APPROVED' }).allowed, false)
  })
  it('requires a dentist for high-risk decisions', () => {
    assert.equal(authorizeDecision({ role: 'HYGIENIST', actorId: 'u2', createdById: 'u1', riskLevel: 'HIGH', decision: 'ESCALATED' }).allowed, false)
  })
  it('prevents approval of high-risk output even by a dentist', () => {
    assert.equal(authorizeDecision({ role: 'DENTIST', actorId: 'u2', createdById: 'u1', riskLevel: 'HIGH', decision: 'APPROVED' }).allowed, false)
  })
  it('allows an independent dentist to escalate critical output', () => {
    assert.equal(authorizeDecision({ role: 'DENTIST', actorId: 'u2', createdById: 'u1', riskLevel: 'CRITICAL', decision: 'ESCALATED' }).allowed, true)
  })
  it('redacts clinical and insurance fields from receptionist views', () => {
    const safe = redactPatient({ id: 'p1', firstName: 'A', medicalHistory: { allergies: ['x'] }, notes: 'private', insurancePolicyNo: 'policy', insuranceGroupNo: 'group' }, 'RECEPTIONIST')
    assert.deepEqual(safe, { id: 'p1', firstName: 'A' })
  })
  it('keeps clinical fields for a dentist', () => {
    const patient = { id: 'p1', medicalHistory: { allergies: [] } }
    assert.deepEqual(redactPatient(patient, 'DENTIST'), patient)
    assert.equal(canReadClinicalData('DENTIST'), true)
  })
})
