'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  CircularProgress,
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

interface Treatment {
  id: string
  treatmentCode: string
  treatmentName: string
  description: string | null
  toothNumber: string | null
  status: string
  estimatedCost: number
  actualCost: number | null
  startDate: string | null
  completionDate: string | null
  notes: string | null
  patientId: string
  dentistId: string
  patient: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
  dentist: {
    id: string
    firstName: string
    lastName: string
  }
}

export default function EditTreatmentPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
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
  const [formData, setFormData] = useState({
    patientId: '',
    dentistId: '',
    treatmentCode: '',
    treatmentName: '',
    description: '',
    toothNumber: '',
    status: 'PLANNED',
    estimatedCost: '',
    actualCost: '',
    startDate: null as Date | null,
    completionDate: null as Date | null,
    notes: '',
  })

  useEffect(() => {
    if (params.id) {
      fetchTreatment()
      fetchPatients()
      fetchDentists()
    }
  }, [params.id])

  const fetchTreatment = async () => {
    try {
      const response = await fetch(`/api/treatments/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch treatment')
      }
      const data: Treatment = await response.json()

      setFormData({
        patientId: data.patientId,
        dentistId: data.dentistId,
        treatmentCode: data.treatmentCode,
        treatmentName: data.treatmentName,
        description: data.description || '',
        toothNumber: data.toothNumber || '',
        status: data.status,
        estimatedCost: Number(data.estimatedCost || 0).toString(),
        actualCost: data.actualCost ? Number(data.actualCost).toString() : '',
        startDate: data.startDate ? new Date(data.startDate) : null,
        completionDate: data.completionDate ? new Date(data.completionDate) : null,
        notes: data.notes || '',
      })

      setSelectedPatient(data.patient)
      setSelectedDentist(data.dentist)
    } catch (error) {
      setError('Failed to load treatment')
    } finally {
      setLoading(false)
    }
  }

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
      const response = await fetch(`/api/treatments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedCost: parseFloat(formData.estimatedCost) || 0,
          actualCost: formData.actualCost ? parseFloat(formData.actualCost) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update treatment')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/treatments/${params.id}`)
      }, 1500)
    } catch (error) {
      setError((error as Error).message || 'Failed to update treatment. Please try again.')
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
    console.log('[AI CDT EDIT] Button clicked!')
    console.log('[AI CDT EDIT] Current treatmentName:', formData.treatmentName)

    if (!formData.treatmentName) {
      setError('Please enter a treatment name first')
      return
    }

    setAiCdtGenerating(true)
    setError('')

    try {
      console.log('[AI CDT EDIT] Making API request...')
      const response = await fetch('/api/ai/suggest-cdt-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentDescription: formData.treatmentName + (formData.description ? ` - ${formData.description}` : ''),
          toothNumber: formData.toothNumber,
        }),
      })

      console.log('[AI CDT EDIT] Response status:', response.status)

      if (!response.ok) {
        throw new Error('Failed to suggest CDT code')
      }

      const data = await response.json()
      console.log('[AI CDT EDIT] Received data:', data)
      console.log('[AI CDT EDIT] Setting treatmentCode to:', data.primaryCode)
      console.log('[AI CDT EDIT] Setting treatmentName to:', data.primaryDescription)

      handleChange('treatmentCode', data.primaryCode)
      handleChange('treatmentName', data.primaryDescription)

      console.log('[AI CDT EDIT] Fields updated successfully')
    } catch (error) {
      console.error('[AI CDT EDIT] Error:', error)
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
      console.log('[AI SOAP EDIT] Generating SOAP notes...')
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
      console.log('[AI SOAP EDIT] Received SOAP notes:', data)
      handleChange('notes', data.soapNotes)
    } catch (error) {
      console.error('[AI SOAP EDIT] Error:', error)
      setError('Failed to generate SOAP notes. Please try again.')
    } finally {
      setAiSoapGenerating(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error && !formData.treatmentCode) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
        <Button
          onClick={() => router.push('/dashboard/treatments')}
          sx={{ mt: 2 }}
        >
          Back to Treatments
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={500} mb={3}>
        Edit Treatment Plan
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
                Treatment updated successfully! Redirecting...
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
                <TextField
                  fullWidth
                  type="number"
                  label="Actual Cost"
                  value={formData.actualCost}
                  onChange={(e) => handleChange('actualCost', e.target.value)}
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
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Completion Date"
                  value={formData.completionDate}
                  onChange={(value) => handleChange('completionDate', value)}
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
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => router.push(`/dashboard/treatments/${params.id}`)}
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
