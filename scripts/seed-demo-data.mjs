import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(project, 'package.json'))
const dotenv = require('dotenv')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const hash = value => createHash('sha256').update(value).digest('hex')
const env = { ...dotenv.parse(fs.readFileSync(path.join(project, '.env'))), ...process.env }
const apply = process.argv.includes('--apply')
if (process.argv.some(arg => arg.startsWith('--') && !['--apply', '--dry-run'].includes(arg))) throw new Error('Use --dry-run or --apply')
if (env.NODE_ENV === 'production' || env.ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'false') throw new Error('Demo seeding is disabled in this environment')
const database = new URL(env.DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) throw new Error('A local PostgreSQL database is required')
const pair = ['PROVISION_ADMIN', 'BOOTSTRAP_ADMIN', 'SEED_ADMIN', 'SEED_USER', 'DEMO', 'ADMIN', 'DEFAULT'].map(prefix => ({ email: env[`${prefix}_EMAIL`], password: env[`${prefix}_PASSWORD`] })).find(value => value.email && value.password)
if (!pair) throw new Error('A configured demo login is required; no account will be reset')
const pool = new Pool({ connectionString: env.DATABASE_URL })
const client = await pool.connect()
const originalTables = ['Clinic', 'User', 'Patient', 'Appointment', 'Treatment', 'InsuranceClaim', 'Reminder', 'Message', 'Document', 'AiRuntimeResult', 'AuditLog', 'PatientConsent', 'FhirImport', 'ClinicalReview', 'ClinicalAuditEvent', 'SecurityIncident']
const originals = new Map()
const fileChanges = []
const inserted = {}
const trainingNote = 'Fictional training data only. Not a real patient, clinical assessment, verified identity, consent, insurance policy, submitted claim or delivered communication.'
async function snapshot(table) {
  return new Map((await client.query(`SELECT id, row_to_json(t)::text AS record FROM "${table}" t ORDER BY id`)).rows.map(row => [row.id, hash(row.record)]))
}
async function insert(table, data) {
  const keys = Object.keys(data)
  const result = await client.query(`INSERT INTO "${table}" (${keys.map(key => `"${key}"`).join(',')}) VALUES (${keys.map((_, index) => `$${index + 1}`).join(',')}) ON CONFLICT (id) DO NOTHING`, Object.values(data))
  inserted[table] = (inserted[table] || 0) + result.rowCount
}
try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
  const actor = (await client.query('SELECT id, password, role, "clinicId", "isActive" FROM "User" WHERE lower(email)=$1', [pair.email.trim().toLowerCase()])).rows[0]
  if (!actor || !actor.isActive || !await bcrypt.compare(pair.password, actor.password)) throw new Error('Configured login does not match an active existing account; no account will be reset')
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`dental-demo-${actor.clinicId}`])
  for (const table of originalTables) originals.set(table, await snapshot(table))
  const namespace = `training-${hash(actor.clinicId).slice(0, 12)}`
  const now = new Date()
  const stamp = now.toISOString()
  const count = async table => Number((await client.query(table === 'Patient'
    ? 'SELECT count(*) FROM "Patient" WHERE "clinicId"=$1'
    : table === 'Message'
      ? 'SELECT count(*) FROM "Message" x JOIN "User" u ON u.id=x."senderId" WHERE x."recipientId"=$2 AND u."clinicId"=$1'
      : `SELECT count(*) FROM "${table}" x JOIN "Patient" p ON p.id=x."patientId" WHERE p."clinicId"=$1`, table === 'Message' ? [actor.clinicId, actor.id] : [actor.clinicId])).rows[0].count)
  const before = {}
  for (const table of ['Patient', 'Appointment', 'Treatment', 'InsuranceClaim', 'Reminder', 'Message', 'Document']) before[table] = await count(table)
  // Attach training records only to fictional training patients, never to existing real records.
  const patients = []
  const childNeedsPatient = ['Appointment', 'Treatment', 'InsuranceClaim', 'Reminder', 'Document'].some(table => before[table] < 15)
  const patientTarget = Math.max(childNeedsPatient ? 1 : 0, 15 - before.Patient)
  const originalPatientIds = originals.get('Patient')
  let newPatients = 0
  for (let index = 1; newPatients < patientTarget; index++) {
    if (index > 10000) throw new Error('Cannot allocate training patient identifiers')
    const id = `${namespace}-patient-${index}`
    await insert('Patient', { id, clinicId: actor.clinicId, firstName: 'Demo Patient', lastName: String(index).padStart(2, '0'), dateOfBirth: new Date(Date.UTC(1980 + index, index % 12, 15)).toISOString(), phone: `202-555-${String(100 + index).padStart(4, '0')}`, email: `dental-training-${index}@example.invalid`, notes: trainingNote, isActive: true, identityMatchKey: null, medicalHistory: null, createdAt: stamp, updatedAt: stamp })
    patients.push(id)
    if (!originalPatientIds.has(id)) newPatients++
    // Existing training patients can supply draft relations when only a child collection needs filling.
    if (before.Patient >= 15 && childNeedsPatient) break
  }
  const dentist = (await client.query('SELECT id FROM "User" WHERE "clinicId"=$1 AND role=$2 ORDER BY "isActive" DESC, id LIMIT 1', [actor.clinicId, 'DENTIST'])).rows[0]
  const trainingDentistId = dentist?.id || `${namespace}-disabled-dentist`
  if (!dentist && before.Treatment < 15) {
    // A disabled fictional persona satisfies the draft's required relation; it cannot log in or approve care.
    await insert('User', { id: trainingDentistId, email: `${namespace}-staff@example.invalid`, password: await bcrypt.hash(randomBytes(48).toString('hex'), 10), firstName: 'Demo', lastName: 'Unassigned Dentist', role: 'DENTIST', clinicId: actor.clinicId, isActive: false, createdAt: stamp, updatedAt: stamp })
  }
  const week = new Date(now); week.setUTCHours(9, 0, 0, 0); week.setUTCDate(week.getUTCDate() - week.getUTCDay() + 1)
  for (const table of ['Appointment', 'Treatment', 'InsuranceClaim', 'Reminder', 'Message', 'Document']) {
    let added = 0
    for (let index = 1; added < 15 - before[table]; index++) {
      if (index > 10000) throw new Error('Cannot allocate training record identifiers')
      const id = `${namespace}-${table.toLowerCase()}-${index}`
      if (originals.get(table).has(id)) continue
      const patientId = patients[(index - 1) % patients.length]
      const start = new Date(week); start.setUTCDate(start.getUTCDate() + Math.floor((index - 1) / 3)); start.setUTCHours(9 + (index - 1) % 3, 0, 0, 0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)
      if (table === 'Appointment') await insert(table, { id, patientId, type: 'CONSULTATION', status: 'SCHEDULED', startTime: start.toISOString(), endTime: end.toISOString(), reason: `Demo appointment ${index} — training only`, notes: trainingNote, createdAt: stamp, updatedAt: stamp })
      if (table === 'Treatment') await insert(table, { id, patientId, dentistId: trainingDentistId, treatmentCode: 'DEMO-DRAFT', treatmentName: `Demo treatment plan ${index}`, description: 'Training draft awaiting real clinician assignment and assessment.', status: 'PLANNED', estimatedCost: 0, notes: trainingNote, createdAt: stamp, updatedAt: stamp })
      if (table === 'InsuranceClaim') await insert(table, { id, patientId, claimNumber: `${namespace}-claim-${String(index).padStart(2, '0')}`, insuranceProvider: 'Demo — no real insurer', policyNumber: 'DEMO-NOT-A-POLICY', status: 'DRAFT', claimedAmount: 0, notes: trainingNote, createdAt: stamp, updatedAt: stamp })
      if (table === 'Reminder') await insert(table, { id, patientId, userId: actor.id, type: 'FOLLOW_UP', status: 'PENDING', title: `Demo reminder ${index}`, message: trainingNote, scheduledAt: new Date(now.getTime() + index * 86400000).toISOString(), method: 'PUSH', createdAt: stamp, updatedAt: stamp })
      if (table === 'Message') await insert(table, { id, senderId: actor.id, recipientId: actor.id, subject: `Demo inbox example ${index}`, body: `${trainingNote}\nExample ${index}: review this draft in the local training workspace. No message was sent externally.`, isRead: false, createdAt: stamp })
      if (table === 'Document') {
        const fileName = `${id}.txt`, folder = path.join(project, 'public', 'demo-training'), file = path.join(folder, fileName), text = `Dental workspace training attachment ${index}\n\n${trainingNote}\n`
        if (apply && !fs.existsSync(file)) { fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(file, text, { flag: 'wx' }); fileChanges.push(file) }
        else if (apply && fs.readFileSync(file, 'utf8') !== text) throw new Error('Existing training attachment differs; refusing to overwrite')
        await insert(table, { id, patientId, type: 'OTHER', fileName, fileUrl: `/demo-training/${fileName}`, fileSize: Buffer.byteLength(text), mimeType: 'text/plain', description: 'Fictional training attachment; no clinical evidence or signed consent.', uploadedAt: stamp })
      }
      added++
    }
  }
  const after = {}
  for (const table of Object.keys(before)) { after[table] = await count(table); if (after[table] < 15) throw new Error(`Minimum row count not reached: ${table}`) }
  for (const [table, previous] of originals) {
    const current = await snapshot(table)
    for (const [id, fingerprint] of previous) if (current.get(id) !== fingerprint) throw new Error(`Existing ${table} row changed; rolling back`)
  }
  await client.query(apply ? 'COMMIT' : 'ROLLBACK')
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run rolled back', scope: 'configured login clinic and inbox', before, after, inserted, originalRowsPreserved: true, credentialsPreserved: true, clinicalConsentAndProviderHistoryPreserved: true }, null, 2))
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  for (const file of fileChanges) fs.unlinkSync(file)
  throw new Error(`Demo seed failed: ${error.message}`)
} finally { client.release(); await pool.end() }
