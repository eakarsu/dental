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
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import TranslateIcon from '@mui/icons-material/Translate'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import { format } from 'date-fns'

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
  appointment: {
    id: string
    startTime: string
  } | null
}

export default function TreatmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [treatment, setTreatment] = useState<Treatment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentPlans, setPaymentPlans] = useState<any>(null)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState('')
  const [showTranslationDialog, setShowTranslationDialog] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchTreatment()
    }
  }, [params.id])

  const fetchTreatment = async () => {
    try {
      const response = await fetch(`/api/treatments/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch treatment')
      }
      const data = await response.json()
      setTreatment(data)
    } catch (error) {
      setError('Failed to load treatment details')
    } finally {
      setLoading(false)
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

  const handleGetPaymentPlans = async () => {
    if (!treatment) return

    setLoadingPlans(true)
    try {
      console.log('[Payment Plans] Requesting payment plans for amount:', treatment.estimatedCost)
      const response = await fetch('/api/ai/payment-plan-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount: Number(treatment.estimatedCost),
          patientName: `${treatment.patient.firstName} ${treatment.patient.lastName}`,
        }),
      })

      console.log('[Payment Plans] Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to get payment plans'
        throw new Error(errorMsg)
      }

      setPaymentPlans(data)
    } catch (error) {
      console.error('[Payment Plans] Error:', error)
      alert(`Error loading payment plans: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleTranslateJargon = async () => {
    if (!treatment) return

    setTranslating(true)
    setError('')

    try {
      console.log('[AI Translate] Translating treatment details...')
      const textToTranslate = `${treatment.treatmentName}: ${treatment.description || 'No description available'}`

      const response = await fetch('/api/ai/translate-jargon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dentalText: textToTranslate,
          includeDiagrams: false,
        }),
      })

      console.log('[AI Translate] Response status:', response.status)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to translate'
        throw new Error(errorMsg)
      }

      setTranslation(data.patientFriendlyText)
      setShowTranslationDialog(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[AI Translate] Error:', errorMessage)
      alert(`Failed to translate: ${errorMessage}`)
    } finally {
      setTranslating(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !treatment) {
    return (
      <Box>
        <Alert severity="error">{error || 'Treatment not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard/treatments')}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={500}>
              {treatment.treatmentName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Treatment ID: {treatment.id}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          <Chip
            label={treatment.status}
            color={getStatusColor(treatment.status)}
          />
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/dashboard/treatments/${params.id}/edit`)}
          >
            Edit Treatment
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Patient Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Patient Name
                  </Typography>
                  <Typography variant="body1">
                    {treatment.patient.firstName} {treatment.patient.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{treatment.patient.phone}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Provider Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Dentist
              </Typography>
              <Typography variant="body1">
                Dr. {treatment.dentist.firstName} {treatment.dentist.lastName}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Treatment Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Treatment Details
                </Typography>
                <Tooltip title="Translate to patient-friendly language">
                  <IconButton
                    onClick={handleTranslateJargon}
                    disabled={translating}
                    color="secondary"
                    size="small"
                  >
                    {translating ? <CircularProgress size={20} /> : <TranslateIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Treatment Code
                  </Typography>
                  <Typography variant="body1">{treatment.treatmentCode}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Tooth Number
                  </Typography>
                  <Typography variant="body1">{treatment.toothNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Estimated Cost
                  </Typography>
                  <Typography variant="body1">
                    ${Number(treatment.estimatedCost || 0).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Actual Cost
                  </Typography>
                  <Typography variant="body1">
                    {treatment.actualCost ? `$${Number(treatment.actualCost).toFixed(2)}` : 'N/A'}
                  </Typography>
                </Grid>
                {treatment.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">{treatment.description}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Timeline
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1">
                    {treatment.startDate
                      ? format(new Date(treatment.startDate), 'PPP')
                      : 'Not scheduled'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Completion Date
                  </Typography>
                  <Typography variant="body1">
                    {treatment.completionDate
                      ? format(new Date(treatment.completionDate), 'PPP')
                      : 'Not completed'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        {treatment.notes && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {treatment.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Payment Plans */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  AI Payment Plan Recommendations
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={loadingPlans ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                  onClick={handleGetPaymentPlans}
                  disabled={loadingPlans}
                  color="secondary"
                >
                  {loadingPlans ? 'Generating...' : 'Get Payment Plans'}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {paymentPlans ? (
                <Grid container spacing={2}>
                  {paymentPlans.plans?.map((plan: any, index: number) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined" sx={{ borderColor: plan.recommended ? 'success.main' : 'divider' }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {plan.planName}
                            </Typography>
                            {plan.recommended && <Chip label="Recommended" color="success" size="small" />}
                          </Box>
                          <Grid container spacing={1} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Monthly Payment</Typography>
                              <Typography variant="h6" color="primary.main">${plan.monthlyPayment?.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Duration</Typography>
                              <Typography variant="h6">{plan.duration} months</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Total w/ Interest</Typography>
                              <Typography variant="body2">${plan.totalWithInterest?.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                              <Typography variant="body2">{plan.interestRate}%</Typography>
                            </Grid>
                          </Grid>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Pros:</Typography>
                          {plan.pros?.map((pro: string, i: number) => (
                            <Typography key={i} variant="body2" color="success.main">• {pro}</Typography>
                          ))}
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 1, display: 'block' }}>Cons:</Typography>
                          {plan.cons?.map((con: string, i: number) => (
                            <Typography key={i} variant="body2" color="error.main">• {con}</Typography>
                          ))}
                          {plan.reasoning && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                              {plan.reasoning}
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {paymentPlans.financialGuidance && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="subtitle2" fontWeight={600}>Financial Guidance</Typography>
                        <Typography variant="body2">{paymentPlans.financialGuidance}</Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Alert severity="info">
                  Click "Get Payment Plans" to see AI-generated personalized payment options for this treatment.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Translation Dialog */}
      <Dialog
        open={showTranslationDialog}
        onClose={() => setShowTranslationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TranslateIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">Patient-Friendly Translation</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              This explanation is written in simple, easy-to-understand language for patients.
            </Alert>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {translation}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTranslationDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(translation)
              alert('Translation copied to clipboard!')
            }}
          >
            Copy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
