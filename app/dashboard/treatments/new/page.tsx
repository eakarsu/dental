'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  MenuItem,
  Autocomplete,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LightbulbIcon from '@mui/icons-material/Lightbulb'

interface Patient {
  id: string
  firstName: string
  lastName: string
  phone: string
}

interface Dentist {
  id: string
  firstName: string
  lastName: string
}

export default function NewTreatmentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiCdtGenerating, setAiCdtGenerating] = useState(false)
  const [aiSoapGenerating, setAiSoapGenerating] = useState(false)
  const [aiTranslating, setAiTranslating] = useState(false)
  const [aiRecommendationsGenerating, setAiRecommendationsGenerating] = useState(false)
  const [aiRiskAssessing, setAiRiskAssessing] = useState(false)
  const [treatmentRecommendations, setTreatmentRecommendations] = useState<any>(null)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)
  const [formData, setFormData] = useState({
    patientId: '',
    dentistId: '',
    treatmentCode: '',
    treatmentName: '',
    description: '',
    toothNumber: '',
    status: 'PLANNED',
    estimatedCost: '',
    startDate: null as Date | null,
    notes: '',
  })

  useEffect(() => {
    fetchPatients()
    fetchDentists()
  }, [])

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      const data = await response.json()
      setPatients(data.patients || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  const fetchDentists = async () => {
    try {
      const response = await fetch('/api/users?role=DENTIST')
      const data = await response.json()
      setDentists(data.users || [])
    } catch (error) {
      console.error('Error fetching dentists:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    try {
      const response = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedCost: parseFloat(formData.estimatedCost) || 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create treatment')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/treatments')
      }, 1500)
    } catch (error) {
      setError((error as Error).message || 'Failed to create treatment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAiGenerateNotes = async () => {
    if (!formData.treatmentName) {
      setError('Please enter a treatment name first')
      return
    }

    setAiGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/ai/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentType: formData.treatmentName,
          treatmentCode: formData.treatmentCode,
          toothNumber: formData.toothNumber,
          description: formData.description,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate notes')
      }

      const data = await response.json()
      handleChange('notes', data.generatedNotes)
    } catch (error) {
      setError('Failed to generate AI notes. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAiSuggestCdtCode = async () => {
    console.log('[AI CDT] Button clicked!')
    console.log('[AI CDT] Current treatmentName:', formData.treatmentName)

    if (!formData.treatmentName) {
      setError('Please enter a treatment name first')
      return
    }

    setAiCdtGenerating(true)
    setError('')

    try {
      console.log('[AI CDT] Making API request...')
      const response = await fetch('/api/ai/suggest-cdt-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentDescription: formData.treatmentName + (formData.description ? ` - ${formData.description}` : ''),
          toothNumber: formData.toothNumber,
        }),
      })

      console.log('[AI CDT] Response status:', response.status)

      if (!response.ok) {
        throw new Error('Failed to suggest CDT code')
      }

      const data = await response.json()
      console.log('[AI CDT] Received data:', data)
      console.log('[AI CDT] Setting treatmentCode to:', data.primaryCode)
      console.log('[AI CDT] Setting treatmentName to:', data.primaryDescription)

      handleChange('treatmentCode', data.primaryCode)
      handleChange('treatmentName', data.primaryDescription)

      console.log('[AI CDT] Fields updated successfully')
    } catch (error) {
      console.error('[AI CDT] Error:', error)
      setError('Failed to suggest CDT code. Please try again.')
    } finally {
      setAiCdtGenerating(false)
    }
  }

  const handleGenerateSoapNotes = async () => {
    if (!formData.treatmentName || !formData.description) {
      setError('Please enter treatment name and clinical findings first')
      return
    }

    setAiSoapGenerating(true)
    setError('')

    try {
      console.log('[AI SOAP] Generating SOAP notes...')
      const response = await fetch('/api/ai/generate-soap-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjective: formData.notes || '',
          objective: formData.description,
          treatmentType: formData.treatmentName,
          toothNumber: formData.toothNumber,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate SOAP notes')
      }

      const data = await response.json()
      console.log('[AI SOAP] Received SOAP notes:', data)
      handleChange('notes', data.soapNotes)
    } catch (error) {
      console.error('[AI SOAP] Error:', error)
      setError('Failed to generate SOAP notes. Please try again.')
    } finally {
      setAiSoapGenerating(false)
    }
  }

  const handleTranslateJargon = async () => {
    if (!formData.notes && !formData.description) {
      setError('Please enter some text to translate')
      return
    }

    setAiTranslating(true)
    setError('')

    try {
      console.log('[AI Translate] Translating jargon...')
      const textToTranslate = formData.notes || formData.description
      const response = await fetch('/api/ai/translate-jargon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dentalText: textToTranslate,
          includeDiagrams: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to translate jargon')
      }

      const data = await response.json()
      console.log('[AI Translate] Received translation:', data)

      // Update the notes field with patient-friendly version
      handleChange('notes', data.patientFriendlyText)
    } catch (error) {
      console.error('[AI Translate] Error:', error)
      setError('Failed to translate jargon. Please try again.')
    } finally {
      setAiTranslating(false)
    }
  }

  const handleGetTreatmentRecommendations = async () => {
    if (!formData.description) {
      setError('Please enter clinical findings first')
      return
    }

    setAiRecommendationsGenerating(true)
    setError('')

    try {
      console.log('[AI Recommendations] Getting treatment recommendations...')
      const response = await fetch('/api/ai/treatment-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: formData.description,
          toothNumber: formData.toothNumber,
          symptoms: formData.notes ? [formData.notes] : [],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get treatment recommendations')
      }

      const data = await response.json()
      console.log('[AI Recommendations] Received recommendations:', data)
      setTreatmentRecommendations(data)
    } catch (error) {
      console.error('[AI Recommendations] Error:', error)
      setError('Failed to get treatment recommendations. Please try again.')
    } finally {
      setAiRecommendationsGenerating(false)
    }
  }

  const handleRiskAssessment = async () => {
    if (!selectedPatient || !formData.treatmentName) {
      setError('Please select a patient and enter treatment name first')
      return
    }

    setAiRiskAssessing(true)
    setError('')

    try {
      console.log('[AI Risk] Performing risk assessment...')
      const response = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientAge: 45, // Would need to calculate from patient.dateOfBirth
          medicalHistory: [],
          plannedProcedure: formData.treatmentName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to perform risk assessment')
      }

      const data = await response.json()
      console.log('[AI Risk] Received assessment:', data)
      setRiskAssessment(data)
    } catch (error) {
      console.error('[AI Risk] Error:', error)
      setError('Failed to perform risk assessment. Please try again.')
    } finally {
      setAiRiskAssessing(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={500} mb={3}>
        New Treatment Plan
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Treatment created successfully! Redirecting...
              </Alert>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Patient & Provider
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${option.phone}`}
                  value={selectedPatient}
                  onChange={(event, newValue) => {
                    setSelectedPatient(newValue)
                    handleChange('patientId', newValue?.id || '')
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Patient" required />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={dentists}
                  getOptionLabel={(option) => `Dr. ${option.firstName} ${option.lastName}`}
                  value={selectedDentist}
                  onChange={(event, newValue) => {
                    setSelectedDentist(newValue)
                    handleChange('dentistId', newValue?.id || '')
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Dentist" required />
                  )}
                />
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 1 }}>
              <Typography variant="h6">
                Treatment Details
              </Typography>
              <Button
                size="small"
                startIcon={<LightbulbIcon />}
                onClick={handleAiSuggestCdtCode}
                disabled={aiCdtGenerating || !formData.treatmentName}
                variant="outlined"
                color="secondary"
              >
                {aiCdtGenerating ? 'Suggesting...' : 'AI Suggest CDT Code'}
              </Button>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Treatment Code (CDT)"
                  value={formData.treatmentCode}
                  onChange={(e) => handleChange('treatmentCode', e.target.value)}
                  placeholder="D0150"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Treatment Name"
                  value={formData.treatmentName}
                  onChange={(e) => handleChange('treatmentName', e.target.value)}
                  placeholder="Comprehensive Oral Evaluation"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tooth Number"
                  value={formData.toothNumber}
                  onChange={(e) => handleChange('toothNumber', e.target.value)}
                  placeholder="e.g., 14"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="PLANNED">Planned</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </Grid>
            </Grid>

            {/* AI Treatment Recommendations */}
            <Box sx={{ mt: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  AI Treatment Recommendations
                </Typography>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGetTreatmentRecommendations}
                  disabled={aiRecommendationsGenerating || !formData.description}
                  variant="outlined"
                  color="secondary"
                >
                  {aiRecommendationsGenerating ? 'Analyzing...' : 'Get Recommendations'}
                </Button>
              </Box>
              {treatmentRecommendations && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  {treatmentRecommendations.recommendedTreatments?.map((treatment: any, index: number) => (
                    <Box key={index} sx={{ mb: index < treatmentRecommendations.recommendedTreatments.length - 1 ? 2 : 0 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {treatment.treatmentName}
                        </Typography>
                        <Chip label={treatment.priority} size="small" color={treatment.priority === 'urgent' ? 'error' : 'default'} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        CDT Code: {treatment.cdtCode} | Cost: ${treatment.estimatedCost?.toLocaleString()} | Success Rate: {treatment.successRate}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {treatment.description}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight={600}>Pros:</Typography>
                          {treatment.pros?.map((pro: string, i: number) => (
                            <Typography key={i} variant="body2" color="success.main">• {pro}</Typography>
                          ))}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" fontWeight={600}>Cons:</Typography>
                          {treatment.cons?.map((con: string, i: number) => (
                            <Typography key={i} variant="body2" color="error.main">• {con}</Typography>
                          ))}
                        </Grid>
                      </Grid>
                      {index < treatmentRecommendations.recommendedTreatments.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                  {treatmentRecommendations.clinicalRationale && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption" fontWeight={600}>Clinical Rationale:</Typography>
                      <Typography variant="body2">{treatmentRecommendations.clinicalRationale}</Typography>
                    </Alert>
                  )}
                </Card>
              )}
            </Box>

            {/* AI Risk Assessment */}
            <Box sx={{ mt: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Pre-Procedure Risk Assessment
                </Typography>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleRiskAssessment}
                  disabled={aiRiskAssessing || !selectedPatient || !formData.treatmentName}
                  variant="outlined"
                  color="warning"
                >
                  {aiRiskAssessing ? 'Assessing...' : 'Assess Risk'}
                </Button>
              </Box>
              {riskAssessment && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Box display="flex" gap={2} mb={2}>
                    <Chip
                      label={`Overall Risk: ${riskAssessment.overallRisk?.toUpperCase()}`}
                      color={
                        riskAssessment.overallRisk === 'low' ? 'success' :
                        riskAssessment.overallRisk === 'medium' ? 'warning' : 'error'
                      }
                    />
                    <Chip label={`Risk Score: ${riskAssessment.riskScore}/100`} variant="outlined" />
                  </Box>

                  {riskAssessment.specificRisks && riskAssessment.specificRisks.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Specific Risks:
                      </Typography>
                      {riskAssessment.specificRisks.map((risk: any, index: number) => (
                        <Alert key={index} severity={risk.severity === 'high' ? 'error' : 'warning'} sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{risk.risk}</Typography>
                          <Typography variant="caption">{risk.description}</Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {riskAssessment.precautions && riskAssessment.precautions.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Required Precautions:
                      </Typography>
                      {riskAssessment.precautions.map((precaution: string, index: number) => (
                        <Typography key={index} variant="body2">• {precaution}</Typography>
                      ))}
                    </Box>
                  )}
                </Card>
              )}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Cost & Scheduling
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Estimated Cost"
                  value={formData.estimatedCost}
                  onChange={(e) => handleChange('estimatedCost', e.target.value)}
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(value) => handleChange('startDate', value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 1 }}>
              <Typography variant="h6">
                Additional Notes
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleAiGenerateNotes}
                  disabled={aiGenerating || !formData.treatmentName}
                  variant="outlined"
                  color="secondary"
                >
                  {aiGenerating ? 'Generating...' : 'AI Notes'}
                </Button>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerateSoapNotes}
                  disabled={aiSoapGenerating || !formData.treatmentName || !formData.description}
                  variant="outlined"
                  color="secondary"
                >
                  {aiSoapGenerating ? 'Generating...' : 'AI SOAP'}
                </Button>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleTranslateJargon}
                  disabled={aiTranslating || (!formData.notes && !formData.description)}
                  variant="outlined"
                  color="secondary"
                >
                  {aiTranslating ? 'Translating...' : 'Simplify'}
                </Button>
              </Box>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box display="flex" gap={2}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving || success}
                size="large"
              >
                {saving ? 'Creating...' : 'Create Treatment'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => router.push('/dashboard/treatments')}
                size="large"
                disabled={saving}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
