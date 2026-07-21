'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material'

type Review = {
  id: string
  patient: { firstName: string; lastName: string }
  status: string
  riskLevel: string
  recommendation?: { treatment: string; medications: string[] }
  contraindications?: string[]
  missingData?: string[]
  escalationReason?: string | null
  createdById: string
  createdAt: string
}

const emptyFHIR = JSON.stringify({
  resourceType: 'Patient',
  id: '',
  identifier: [{ system: 'https://example.org/mrn', value: '' }],
  name: [{ family: '', given: [''] }],
  birthDate: '',
  telecom: [],
}, null, 2)

export default function ClinicalReviewPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [fhir, setFhir] = useState(emptyFHIR)
  const [sourceSystem, setSourceSystem] = useState('')
  const [consentSource, setConsentSource] = useState('')
  const [treatment, setTreatment] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medications, setMedications] = useState('')
  const [evidence, setEvidence] = useState('')
  const [decision, setDecision] = useState<{ review: Review; value: 'APPROVED' | 'REJECTED' | 'ESCALATED'; rationale: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/clinical/reviews', { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) setError(body.error ?? 'Unable to load review queue')
    else setReviews(body)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function submitIntake() {
    setError('')
    let fhirPatient
    try { fhirPatient = JSON.parse(fhir) } catch { setError('FHIR Patient JSON is invalid'); return }
    const response = await fetch('/api/clinical/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fhirPatient,
        sourceSystem,
        consent: { scope: 'clinical-care', source: consentSource, effectiveAt: new Date().toISOString(), provenance: { capturedBy: session?.user?.id, method: consentSource } },
        clinicalContext: {
          allergies: allergies ? allergies.split(',').map((item) => item.trim()).filter(Boolean) : undefined,
          medications: medications ? medications.split(',').map((item) => item.trim()).filter(Boolean) : undefined,
        },
        proposedTreatment: treatment,
        evidence: [{ source: 'clinical-reference', reference: evidence, retrievedAt: new Date().toISOString() }],
        provenance: { authoringSystem: 'Dental Clinic review workspace', generatedAt: new Date().toISOString() },
      }),
    })
    const body = await response.json()
    if (!response.ok) { setError(body.error ?? 'Intake failed'); return }
    setOpen(false)
    setFhir(emptyFHIR); setTreatment(''); setEvidence(''); setAllergies(''); setMedications('')
    await load()
  }

  async function submitDecision() {
    if (!decision) return
    const response = await fetch(`/api/clinical/reviews/${decision.review.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: decision.value, rationale: decision.rationale }),
    })
    const body = await response.json()
    if (!response.ok) { setError(body.error ?? 'Decision failed'); return }
    setDecision(null)
    await load()
  }

  return <Stack spacing={3}>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h4">Clinical review queue</Typography>
        <Typography color="text.secondary">FHIR identity and consent intake with independent safety decisions.</Typography>
      </Box>
      <Button variant="contained" onClick={() => setOpen(true)}>New governed intake</Button>
    </Box>
    <Alert severity="warning">Recommendations are decision support only. High-risk or incomplete records cannot be approved and must be escalated to a dentist.</Alert>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {loading ? <CircularProgress /> : reviews.length === 0 ? <Alert severity="info">No reviews are waiting.</Alert> : <Grid container spacing={2}>
      {reviews.map((review) => <Grid key={review.id} size={{ xs: 12, lg: 6 }}><Card><CardContent>
        <Stack spacing={1.5}>
          <Box display="flex" justifyContent="space-between"><Typography variant="h6">{review.patient.firstName} {review.patient.lastName}</Typography><Stack direction="row" spacing={1}><Chip label={review.riskLevel} color={review.riskLevel === 'CRITICAL' || review.riskLevel === 'HIGH' ? 'error' : 'default'} /><Chip label={review.status} /></Stack></Box>
          {review.recommendation && <Typography><strong>Proposed:</strong> {review.recommendation.treatment}</Typography>}
          {!!review.contraindications?.length && <Alert severity="error">{review.contraindications.join(' ')}</Alert>}
          {!!review.missingData?.length && <Alert severity="warning">Missing: {review.missingData.join(', ')}</Alert>}
          <Typography variant="caption" color="text.secondary">Created {new Date(review.createdAt).toLocaleString()} · immutable case {review.id}</Typography>
          {review.status === 'PENDING_REVIEW' && review.recommendation && <Stack direction="row" spacing={1}>
            <Button size="small" color="success" onClick={() => setDecision({ review, value: 'APPROVED', rationale: '' })}>Approve</Button>
            <Button size="small" color="error" onClick={() => setDecision({ review, value: 'REJECTED', rationale: '' })}>Reject</Button>
            <Button size="small" onClick={() => setDecision({ review, value: 'ESCALATED', rationale: '' })}>Escalate</Button>
          </Stack>}
        </Stack>
      </CardContent></Card></Grid>)}
    </Grid>}

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Governed FHIR intake</DialogTitle>
      <DialogContent><Stack spacing={2} mt={1}>
        <TextField label="FHIR source system" value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} required helperText="Issuer or endpoint that supplied this resource" />
        <TextField label="Consent evidence" value={consentSource} onChange={(e) => setConsentSource(e.target.value)} required helperText="Signed form, portal attestation, or recorded-verbal reference" />
        <TextField label="FHIR R4 Patient resource" value={fhir} onChange={(e) => setFhir(e.target.value)} multiline minRows={10} required />
        <TextField label="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} helperText="Comma separated; leave blank to trigger missing-data escalation" />
        <TextField label="Current medications" value={medications} onChange={(e) => setMedications(e.target.value)} helperText="Comma separated; leave blank to trigger missing-data escalation" />
        <TextField label="Proposed treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} multiline minRows={3} required />
        <TextField label="Evidence reference" value={evidence} onChange={(e) => setEvidence(e.target.value)} required helperText="Guideline URI, document identifier, or source record" />
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={submitIntake}>Create review</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(decision)} onClose={() => setDecision(null)} fullWidth>
      <DialogTitle>{decision?.value.toLowerCase()} clinical recommendation</DialogTitle>
      <DialogContent><TextField select fullWidth sx={{ mt: 1, mb: 2 }} label="Decision" value={decision?.value ?? 'APPROVED'} onChange={(e) => decision && setDecision({ ...decision, value: e.target.value as typeof decision.value })}>
        <MenuItem value="APPROVED">Approve</MenuItem><MenuItem value="REJECTED">Reject</MenuItem><MenuItem value="ESCALATED">Escalate</MenuItem>
      </TextField><TextField fullWidth multiline minRows={4} label="Clinical rationale" value={decision?.rationale ?? ''} onChange={(e) => decision && setDecision({ ...decision, rationale: e.target.value })} /></DialogContent>
      <DialogActions><Button onClick={() => setDecision(null)}>Cancel</Button><Button variant="contained" onClick={submitDecision}>Record final decision</Button></DialogActions>
    </Dialog>
  </Stack>
}
