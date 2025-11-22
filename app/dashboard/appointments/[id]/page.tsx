'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import { format } from 'date-fns'

interface Appointment {
  id: string
  type: string
  status: string
  startTime: string
  endTime: string
  reason: string | null
  notes: string | null
  roomNumber: string | null
  patient: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
    dateOfBirth: string | null
  }
  dentist: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface NoShowPrediction {
  riskLevel: 'low' | 'medium' | 'high'
  probability: number
  riskFactors: string[]
  recommendations: string[]
  confidenceScore: number
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prediction, setPrediction] = useState<NoShowPrediction | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [showPredictionDialog, setShowPredictionDialog] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAppointment()
    }
  }, [params.id])

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch appointment')
      }
      const data = await response.json()
      setAppointment(data)
    } catch (error) {
      setError('Failed to load appointment details')
    } finally {
      setLoading(false)
    }
  }

  const handlePredictNoShow = async () => {
    if (!appointment) return

    setPredicting(true)
    setError('')

    try {
      console.log('[No-Show Prediction] Starting prediction for appointment:', appointment.id)
      const response = await fetch('/api/ai/predict-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
        }),
      })

      console.log('[No-Show Prediction] Response status:', response.status)
      const data = await response.json()
      console.log('[No-Show Prediction] Response data:', data)

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to predict no-show'
        throw new Error(errorMsg)
      }

      // The API returns an array of predictions, get the first one
      if (data.predictions && data.predictions.length > 0) {
        const predictionData = data.predictions[0]
        setPrediction({
          riskLevel: predictionData.riskLevel,
          probability: predictionData.probability,
          riskFactors: predictionData.riskFactors,
          recommendations: predictionData.recommendations,
          confidenceScore: predictionData.confidenceScore,
        })
        setShowPredictionDialog(true)
      } else {
        throw new Error('No prediction data received')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[No-Show Prediction] Error:', errorMessage)
      setError(`Failed to predict no-show: ${errorMessage}`)
    } finally {
      setPredicting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success'
      case 'IN_PROGRESS':
        return 'warning'
      case 'COMPLETED':
        return 'default'
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'error'
      case 'PENDING':
        return 'info'
      default:
        return 'default'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
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

  if (error || !appointment) {
    return (
      <Box>
        <Alert severity="error">{error || 'Appointment not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/appointments')}
          sx={{ mt: 2 }}
        >
          Back to Appointments
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
            onClick={() => router.push('/dashboard/appointments')}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={500}>
              Appointment Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointment.patient.firstName} {appointment.patient.lastName} - {appointment.type}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={appointment.status}
          color={getStatusColor(appointment.status)}
          size="large"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No-Show Risk Prediction Card */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper', border: '2px solid', borderColor: 'secondary.main' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                No-Show Risk Prediction
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={predicting ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              onClick={handlePredictNoShow}
              disabled={predicting}
              color="secondary"
            >
              {predicting ? 'Analyzing...' : 'Predict No-Show Risk'}
            </Button>
          </Box>

          {prediction ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" gap={2} alignItems="center">
                  <Chip
                    label={`${prediction.riskLevel.toUpperCase()} RISK`}
                    color={getRiskColor(prediction.riskLevel)}
                    size="medium"
                  />
                  <Typography variant="body1">
                    <strong>Probability:</strong> {prediction.probability}%
                  </Typography>
                  <Typography variant="body1">
                    <strong>Confidence:</strong> {prediction.confidenceScore}%
                  </Typography>
                </Box>
              </Grid>

              {/* Risk Factors */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" />
                    Risk Factors
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    {prediction.riskFactors.map((factor, index) => (
                      <li key={index}>
                        <Typography variant="body2">{factor}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* Recommendations */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" />
                    Recommendations
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              Click "Predict No-Show Risk" to analyze the likelihood of this patient not showing up for the appointment.
            </Alert>
          )}
        </CardContent>
      </Card>

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
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{appointment.patient.phone}</Typography>
                </Grid>
                {appointment.patient.email && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{appointment.patient.email}</Typography>
                  </Grid>
                )}
                {appointment.patient.dateOfBirth && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(appointment.patient.dateOfBirth), 'PP')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Appointment Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appointment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Appointment Type
                  </Typography>
                  <Typography variant="body1">{appointment.type}</Typography>
                </Grid>
                {appointment.dentist && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Dentist
                    </Typography>
                    <Typography variant="body1">
                      Dr. {appointment.dentist.firstName} {appointment.dentist.lastName}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Start Time
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(appointment.startTime), 'PPpp')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    End Time
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(appointment.endTime), 'PPpp')}
                  </Typography>
                </Grid>
                {appointment.roomNumber && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Room Number
                    </Typography>
                    <Typography variant="body1">{appointment.roomNumber}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Reason */}
        {appointment.reason && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reason
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {appointment.reason}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Notes */}
        {appointment.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {appointment.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Prediction Details Dialog */}
      <Dialog
        open={showPredictionDialog}
        onClose={() => setShowPredictionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6">No-Show Risk Analysis</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {prediction && (
            <Box>
              <Box display="flex" gap={2} mb={3}>
                <Chip
                  label={`${prediction.riskLevel.toUpperCase()} RISK`}
                  color={getRiskColor(prediction.riskLevel)}
                  size="medium"
                />
                <Chip
                  label={`${prediction.probability}% Probability`}
                  variant="outlined"
                />
                <Chip
                  label={`${prediction.confidenceScore}% Confidence`}
                  variant="outlined"
                />
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity={prediction.riskLevel === 'high' ? 'error' : prediction.riskLevel === 'medium' ? 'warning' : 'success'}>
                    <Typography variant="body2">
                      {prediction.riskLevel === 'high' && 'This appointment has a HIGH risk of no-show. Take immediate action.'}
                      {prediction.riskLevel === 'medium' && 'This appointment has a MEDIUM risk of no-show. Consider sending reminders.'}
                      {prediction.riskLevel === 'low' && 'This appointment has a LOW risk of no-show. Standard procedures apply.'}
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" />
                    Risk Factors
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {prediction.riskFactors.map((factor, index) => (
                      <li key={index}>
                        <Typography variant="body2">{factor}</Typography>
                      </li>
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" />
                    Recommended Actions
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPredictionDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
