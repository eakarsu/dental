'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  GridLegacy as Grid,
  Typography,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { format } from 'date-fns'

interface Patient {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  address: string | null
  insuranceProvider: string | null
  insurancePolicyNo: string | null
  medicalHistory: string | null
  allergies: string | null
  medications: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  treatments: {
    id: string
    treatmentCode: string
    treatmentName: string
    description: string | null
    status: string
    estimatedCost: number
    startDate: string | null
    toothNumber: string | null
  }[]
  appointments: {
    id: string
    type: string
    status: string
    startTime: string
  }[]
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Risk Assessment
  const [showRiskDialog, setShowRiskDialog] = useState(false)
  const [riskAssessing, setRiskAssessing] = useState(false)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)
  const [plannedProcedure, setPlannedProcedure] = useState('')

  // Treatment Recommendations
  const [showRecommendationsDialog, setShowRecommendationsDialog] = useState(false)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')

  // Treatment Plan Summary
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [treatmentSummary, setTreatmentSummary] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchPatient()
    }
  }, [params.id])

  const fetchPatient = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch patient')
      }
      const data = await response.json()
      setPatient(data)
    } catch (error) {
      setError('Failed to load patient details')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleRiskAssessment = async () => {
    if (!patient || !plannedProcedure) {
      setError('Please enter a planned procedure')
      return
    }

    setRiskAssessing(true)
    setError('')

    try {
      const age = calculateAge(patient.dateOfBirth)

      // Handle medicalHistory as either JSON object or string
      let medicalHistory: string[] = []
      let medications: string[] = []
      let allergies: string[] = []

      if (typeof patient.medicalHistory === 'object' && patient.medicalHistory) {
        // Extract from JSON object
        const medHistory = patient.medicalHistory as any
        medicalHistory = medHistory.conditions ? (Array.isArray(medHistory.conditions) ? medHistory.conditions : [medHistory.conditions]) : []
        medications = medHistory.medications ? (Array.isArray(medHistory.medications) ? medHistory.medications : [medHistory.medications]) : []
        allergies = medHistory.allergies ? (Array.isArray(medHistory.allergies) ? medHistory.allergies : [medHistory.allergies]) : []
      } else {
        // Handle as strings
        medicalHistory = patient.medicalHistory && typeof patient.medicalHistory === 'string'
          ? patient.medicalHistory.split(',').map(s => s.trim())
          : []
        medications = patient.medications && typeof patient.medications === 'string'
          ? patient.medications.split(',').map(s => s.trim())
          : []
        allergies = patient.allergies && typeof patient.allergies === 'string'
          ? patient.allergies.split(',').map(s => s.trim())
          : []
      }

      const response = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientAge: age || 30,
          medicalHistory,
          medications,
          allergies,
          plannedProcedure,
        }),
      })

      console.log('[AI Risk Assessment] Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to assess risk'
        throw new Error(errorMsg)
      }

      setRiskAssessment(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[AI Risk Assessment] Error:', errorMessage)
      setError(`Failed to assess risk: ${errorMessage}`)
    } finally {
      setRiskAssessing(false)
    }
  }

  const handleGetRecommendations = async () => {
    if (!diagnosis) {
      setError('Please enter a diagnosis')
      return
    }

    setRecommendationsLoading(true)
    setError('')

    try {
      const age = calculateAge(patient?.dateOfBirth || null)

      // Handle medicalHistory as either JSON object or string
      let medicalHistory: string[] = []
      if (typeof patient?.medicalHistory === 'object' && patient.medicalHistory) {
        const medHistory = patient.medicalHistory as any
        medicalHistory = medHistory.conditions ? (Array.isArray(medHistory.conditions) ? medHistory.conditions : [medHistory.conditions]) : []
      } else if (patient?.medicalHistory && typeof patient.medicalHistory === 'string') {
        medicalHistory = patient.medicalHistory.split(',').map(s => s.trim())
      }

      const symptomsList = symptoms ? symptoms.split(',').map(s => s.trim()) : []

      const response = await fetch('/api/ai/treatment-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis,
          symptoms: symptomsList,
          patientAge: age,
          medicalHistory,
        }),
      })

      console.log('[AI Treatment Recommendations] Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to get recommendations'
        throw new Error(errorMsg)
      }

      setRecommendations(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[AI Treatment Recommendations] Error:', errorMessage)
      setError(`Failed to get recommendations: ${errorMessage}`)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!patient || patient.treatments.length === 0) {
      setError('No treatments found for this patient')
      return
    }

    setSummaryLoading(true)
    setError('')

    try {
      console.log('[AI Treatment Plan Summary] Generating summary...')
      const totalCost = patient.treatments.reduce((sum, t) => sum + Number(t.estimatedCost), 0)

      const response = await fetch('/api/ai/treatment-plan-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatments: patient.treatments.map(t => ({
            treatmentCode: t.treatmentCode,
            treatmentName: t.treatmentName,
            toothNumber: t.toothNumber,
            estimatedCost: Number(t.estimatedCost),
            description: t.description,
          })),
          patientName: `${patient.firstName} ${patient.lastName}`,
          totalCost,
        }),
      })

      console.log('[AI Treatment Plan Summary] Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to generate summary'
        throw new Error(errorMsg)
      }

      setTreatmentSummary(data.summary)
      setShowSummaryDialog(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[AI Treatment Plan Summary] Error:', errorMessage)
      setError(`Failed to generate summary: ${errorMessage}`)
    } finally {
      setSummaryLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
      case 'very_high':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'warning'
      case 'PLANNED':
        return 'info'
      case 'CANCELLED':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error && !patient) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/patients')}
          sx={{ mt: 2 }}
        >
          Back to Patients
        </Button>
      </Box>
    )
  }

  if (!patient) {
    return (
      <Box>
        <Alert severity="error">Patient not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/patients')}
          sx={{ mt: 2 }}
        >
          Back to Patients
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard/patients')}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={500}>
              {patient.firstName} {patient.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Patient ID: {patient.id}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => router.push(`/dashboard/patients/${params.id}/edit`)}
        >
          Edit Patient
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* AI Features Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', border: '2px solid', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Risk Assessment
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assess procedure risk based on patient history
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => setShowRiskDialog(true)}
              >
                Assess Procedure Risk
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', border: '2px solid', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Treatment Recommendations
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Get AI-powered treatment suggestions
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => setShowRecommendationsDialog(true)}
              >
                Get Recommendations
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', border: '2px solid', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Treatment Plan Summary
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Generate patient-friendly summary
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={handleGenerateSummary}
                disabled={summaryLoading || patient.treatments.length === 0}
                startIcon={summaryLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              >
                {summaryLoading ? 'Generating...' : 'Generate Summary'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1">
                    {patient.firstName} {patient.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{patient.phone}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{patient.email || 'N/A'}</Typography>
                </Grid>
                {patient.dateOfBirth && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(patient.dateOfBirth), 'PP')}
                    </Typography>
                  </Grid>
                )}
                {patient.dateOfBirth && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Age
                    </Typography>
                    <Typography variant="body1">{calculateAge(patient.dateOfBirth)} years</Typography>
                  </Grid>
                )}
                {patient.address && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{patient.address}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Insurance Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insurance Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Insurance Provider
                  </Typography>
                  <Typography variant="body1">{patient.insuranceProvider || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Policy Number
                  </Typography>
                  <Typography variant="body1">{patient.insurancePolicyNo || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Medical Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Medical Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Medical History
                  </Typography>
                  <Typography variant="body1">
                    {typeof patient.medicalHistory === 'object' && patient.medicalHistory
                      ? JSON.stringify(patient.medicalHistory)
                      : patient.medicalHistory || 'None reported'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Allergies
                  </Typography>
                  <Typography variant="body1">
                    {typeof patient.medicalHistory === 'object' && (patient.medicalHistory as any)?.allergies
                      ? (patient.medicalHistory as any).allergies
                      : patient.allergies || 'None reported'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Current Medications
                  </Typography>
                  <Typography variant="body1">
                    {typeof patient.medicalHistory === 'object' && (patient.medicalHistory as any)?.medications
                      ? (patient.medicalHistory as any).medications
                      : patient.medications || 'None reported'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Emergency Contact */}
        {(patient.emergencyContact || patient.emergencyPhone) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Contact Name
                    </Typography>
                    <Typography variant="body1">{patient.emergencyContact || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Contact Phone
                    </Typography>
                    <Typography variant="body1">{patient.emergencyPhone || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Treatments */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Treatment History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {patient.treatments && patient.treatments.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Treatment</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Tooth</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.treatments.map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell>{treatment.treatmentName}</TableCell>
                          <TableCell>{treatment.treatmentCode}</TableCell>
                          <TableCell>{treatment.toothNumber || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              label={treatment.status}
                              color={getStatusColor(treatment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>${Number(treatment.estimatedCost).toFixed(2)}</TableCell>
                          <TableCell>
                            {treatment.startDate
                              ? format(new Date(treatment.startDate), 'PP')
                              : 'Not scheduled'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No treatments recorded yet.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Appointments */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appointment History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {patient.appointments && patient.appointments.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date & Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patient.appointments.slice(0, 10).map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{appointment.type}</TableCell>
                          <TableCell>
                            <Chip
                              label={appointment.status}
                              color={getStatusColor(appointment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {format(new Date(appointment.startTime), 'PPpp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No appointments recorded yet.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Assessment Dialog */}
      <Dialog
        open={showRiskDialog}
        onClose={() => setShowRiskDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">AI Procedure Risk Assessment</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Planned Procedure"
              placeholder="e.g., Root Canal Therapy, Tooth Extraction"
              value={plannedProcedure}
              onChange={(e) => setPlannedProcedure(e.target.value)}
              sx={{ mb: 3 }}
              required
            />

            {riskAssessment && (
              <Box>
                <Box display="flex" gap={2} mb={3}>
                  <Chip
                    label={`${riskAssessment.overallRisk?.toUpperCase()} RISK`}
                    color={getRiskColor(riskAssessment.overallRisk)}
                    size="medium"
                  />
                  <Chip
                    label={`Risk Score: ${riskAssessment.riskScore}/100`}
                    variant="outlined"
                  />
                </Box>

                <Alert severity={riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'very_high' ? 'error' : riskAssessment.overallRisk === 'medium' ? 'warning' : 'success'} sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {riskAssessment.disclaimer}
                  </Typography>
                </Alert>

                {/* Risk Categories */}
                {riskAssessment.riskCategories && (
                  <Box mb={3}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Risk Categories
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.entries(riskAssessment.riskCategories).map(([category, data]: [string, any]) => (
                        <Grid item xs={6} sm={4} key={category}>
                          <Box sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Typography>
                            <Chip
                              label={data.level}
                              color={getRiskColor(data.level)}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* Specific Risks */}
                {riskAssessment.specificRisks && riskAssessment.specificRisks.length > 0 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Specific Risks ({riskAssessment.specificRisks.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {riskAssessment.specificRisks.map((risk: any, index: number) => (
                        <Alert key={index} severity={risk.severity === 'high' ? 'error' : 'warning'} sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{risk.risk}</Typography>
                          <Typography variant="caption" display="block">{risk.description}</Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            <strong>Likelihood:</strong> {risk.likelihood}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </Typography>
                        </Alert>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Precautions */}
                {riskAssessment.precautions && riskAssessment.precautions.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Required Precautions
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {riskAssessment.precautions.map((precaution: string, index: number) => (
                          <li key={index}>
                            <Typography variant="body2">{precaution}</Typography>
                          </li>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Required Consultations */}
                {riskAssessment.requiredConsultations && riskAssessment.requiredConsultations.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600}>Required Consultations:</Typography>
                    <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                      {riskAssessment.requiredConsultations.map((consultation: string, index: number) => (
                        <li key={index}>
                          <Typography variant="body2">{consultation}</Typography>
                        </li>
                      ))}
                    </Box>
                  </Alert>
                )}

                {/* Patient Counseling */}
                {riskAssessment.patientCounseling && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600}>Patient Counseling:</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {riskAssessment.patientCounseling}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowRiskDialog(false)
            setRiskAssessment(null)
            setPlannedProcedure('')
          }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleRiskAssessment}
            disabled={riskAssessing || !plannedProcedure}
            startIcon={riskAssessing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            color="secondary"
          >
            {riskAssessing ? 'Assessing...' : 'Assess Risk'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Treatment Recommendations Dialog */}
      <Dialog
        open={showRecommendationsDialog}
        onClose={() => setShowRecommendationsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">AI Treatment Recommendations</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Diagnosis / Clinical Findings"
              placeholder="e.g., Deep caries on tooth #14, patient experiencing pain"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              sx={{ mb: 2 }}
              multiline
              rows={2}
              required
            />
            <TextField
              fullWidth
              label="Symptoms (comma-separated)"
              placeholder="e.g., Pain, Sensitivity, Swelling"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              sx={{ mb: 3 }}
            />

            {recommendations && (
              <Box>
                {recommendations.recommendedTreatments && recommendations.recommendedTreatments.length > 0 && (
                  <Box>
                    {recommendations.recommendedTreatments.map((treatment: any, index: number) => (
                      <Card key={index} variant="outlined" sx={{ mb: 2, borderColor: treatment.priority === 'urgent' ? 'error.main' : 'divider' }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6" fontWeight={600}>
                              {treatment.treatmentName}
                            </Typography>
                            <Chip
                              label={treatment.priority}
                              color={treatment.priority === 'urgent' ? 'error' : treatment.priority === 'high' ? 'warning' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            CDT Code: {treatment.cdtCode} | Cost: ${treatment.estimatedCost?.toLocaleString()} | Duration: {treatment.duration} | Visits: {treatment.visits}
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {treatment.description}
                          </Typography>
                          <Grid container spacing={2} sx={{ mb: 1 }}>
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
                          <Typography variant="caption" color="text.secondary">
                            Success Rate: {treatment.successRate} | Recovery: {treatment.recoveryTime}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}

                {recommendations.clinicalRationale && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight={600}>Clinical Rationale:</Typography>
                    <Typography variant="body2">{recommendations.clinicalRationale}</Typography>
                  </Alert>
                )}

                {recommendations.patientEducation && (
                  <Alert severity="success">
                    <Typography variant="caption" fontWeight={600}>Patient Education:</Typography>
                    <Typography variant="body2">{recommendations.patientEducation}</Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowRecommendationsDialog(false)
            setRecommendations(null)
            setDiagnosis('')
            setSymptoms('')
          }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleGetRecommendations}
            disabled={recommendationsLoading || !diagnosis}
            startIcon={recommendationsLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            color="secondary"
          >
            {recommendationsLoading ? 'Generating...' : 'Get Recommendations'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Treatment Plan Summary Dialog */}
      <Dialog
        open={showSummaryDialog}
        onClose={() => setShowSummaryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">Patient-Friendly Treatment Plan Summary</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {treatmentSummary && (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  This summary has been generated in patient-friendly language. You can copy it to share with the patient.
                </Alert>
                <Paper sx={{ p: 2, bgcolor: 'background.default', whiteSpace: 'pre-wrap' }}>
                  <Typography variant="body1">
                    {treatmentSummary}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowSummaryDialog(false)
            setTreatmentSummary('')
          }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(treatmentSummary)
              alert('Summary copied to clipboard!')
            }}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
