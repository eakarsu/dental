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
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { format } from 'date-fns'

interface Claim {
  id: string
  claimNumber: string
  insuranceProvider: string
  policyNumber: string
  status: string
  submittedDate: string | null
  approvedDate: string | null
  deniedDate: string | null
  claimedAmount: number
  approvedAmount: number | null
  paidAmount: number | null
  denialReason: string | null
  notes: string | null
  patient: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
    dateOfBirth: string | null
    insuranceProvider: string | null
    insurancePolicyNo: string | null
  }
  treatment: {
    id: string
    treatmentCode: string
    treatmentName: string
    estimatedCost: number
    dentist: {
      id: string
      firstName: string
      lastName: string
    }
  } | null
}

interface AIClaimAnalysis {
  denialRisk: string
  riskFactors: string[]
  recommendations: string[]
  requiredDocumentation: string[]
  medicalNecessityStatement: string
  estimatedApprovalAmount: number
  tips: string[]
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<AIClaimAnalysis | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [appealLetter, setAppealLetter] = useState('')
  const [generatingAppeal, setGeneratingAppeal] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchClaim()
    }
  }, [params.id])

  const fetchClaim = async () => {
    try {
      const response = await fetch(`/api/claims/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch claim')
      }
      const data = await response.json()
      setClaim(data)
    } catch (error) {
      setError('Failed to load claim details')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeClaim = async () => {
    if (!claim || !claim.treatment) {
      setError('Cannot analyze claim without treatment information')
      return
    }

    setAiAnalyzing(true)
    setError('')

    try {
      console.log('[AI Analyze Claim] Starting analysis...')
      const requestBody = {
        treatmentCode: claim.treatment.treatmentCode,
        treatmentName: claim.treatment.treatmentName,
        claimedAmount: Number(claim.claimedAmount),
        insuranceProvider: claim.insuranceProvider,
        patientAge: claim.patient.dateOfBirth
          ? new Date().getFullYear() - new Date(claim.patient.dateOfBirth).getFullYear()
          : undefined,
        medicalNecessity: claim.notes || '',
      }
      console.log('[AI Analyze Claim] Request body:', requestBody)

      const response = await fetch('/api/ai/analyze-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('[AI Analyze Claim] Response status:', response.status)
      const data = await response.json()
      console.log('[AI Analyze Claim] Response data:', data)

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to analyze claim'
        throw new Error(errorMsg)
      }

      console.log('[AI Analyze Claim] Analysis received successfully')
      setAiAnalysis(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[AI Analyze Claim] Error:', errorMessage)
      setError(`Failed to analyze claim: ${errorMessage}`)
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleGenerateAppealLetter = async () => {
    if (!claim || !claim.treatment || !claim.denialReason) {
      setError('Cannot generate appeal letter without denial information')
      return
    }

    setGeneratingAppeal(true)
    setError('')

    try {
      console.log('[AI Appeal Letter] Generating appeal letter...')
      const response = await fetch('/api/ai/generate-appeal-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: `${claim.patient.firstName} ${claim.patient.lastName}`,
          claimNumber: claim.claimNumber,
          treatmentCode: claim.treatment.treatmentCode,
          treatmentName: claim.treatment.treatmentName,
          denialReason: claim.denialReason,
          claimedAmount: claim.claimedAmount,
          insuranceProvider: claim.insuranceProvider,
          dateOfService: claim.submittedDate || new Date().toISOString(),
          clinicalJustification: claim.notes || aiAnalysis?.medicalNecessityStatement || '',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate appeal letter')
      }

      const data = await response.json()
      console.log('[AI Appeal Letter] Letter generated:', data)
      setAppealLetter(data.appealLetter)
    } catch (error) {
      console.error('[AI Appeal Letter] Error:', error)
      setError('Failed to generate appeal letter. Please try again.')
    } finally {
      setGeneratingAppeal(false)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success'
      case 'APPROVED':
      case 'PARTIALLY_APPROVED':
        return 'info'
      case 'SUBMITTED':
      case 'PENDING':
        return 'warning'
      case 'DENIED':
        return 'error'
      case 'DRAFT':
        return 'default'
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

  if (error || !claim) {
    return (
      <Box>
        <Alert severity="error">{error || 'Claim not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/claims')}
          sx={{ mt: 2 }}
        >
          Back to Claims
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
            onClick={() => router.push('/dashboard/claims')}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={500}>
              Claim {claim.claimNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Claim ID: {claim.id}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={aiAnalyzing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={handleAnalyzeClaim}
            disabled={aiAnalyzing || !claim.treatment}
            color="secondary"
          >
            {aiAnalyzing ? 'Analyzing...' : 'AI Analyze Claim'}
          </Button>
          <Chip
            label={claim.status.replace('_', ' ')}
            color={getStatusColor(claim.status)}
            size="large"
          />
        </Box>
      </Box>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <Card sx={{ mb: 3, bgcolor: 'background.paper', border: '2px solid', borderColor: 'secondary.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                AI Claim Analysis
              </Typography>
              <Chip
                label={`${aiAnalysis.denialRisk.toUpperCase()} RISK`}
                color={getRiskColor(aiAnalysis.denialRisk)}
                size="small"
              />
            </Box>

            <Grid container spacing={3}>
              {/* Risk Factors */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" />
                    Risk Factors
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {aiAnalysis.riskFactors.map((factor, index) => (
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
                  <Box component="ul" sx={{ pl: 2 }}>
                    {aiAnalysis.recommendations.map((rec, index) => (
                      <li key={index}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* Required Documentation */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon fontSize="small" />
                    Required Documentation
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {aiAnalysis.requiredDocumentation.map((doc, index) => (
                      <li key={index}>
                        <Typography variant="body2">{doc}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* Tips */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon fontSize="small" />
                    Tips
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {aiAnalysis.tips.map((tip, index) => (
                      <li key={index}>
                        <Typography variant="body2">{tip}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* Medical Necessity Statement */}
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    AI-Generated Medical Necessity Statement
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {aiAnalysis.medicalNecessityStatement}
                  </Typography>
                </Box>
              </Grid>

              {/* Estimated Approval */}
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Estimated Approval Amount:</strong> ${aiAnalysis.estimatedApprovalAmount.toFixed(2)}
                    {' '}(Claimed: ${Number(claim.claimedAmount || 0).toFixed(2)})
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

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
                    {claim.patient.firstName} {claim.patient.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{claim.patient.phone}</Typography>
                </Grid>
                {claim.patient.email && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{claim.patient.email}</Typography>
                  </Grid>
                )}
                {claim.patient.dateOfBirth && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(claim.patient.dateOfBirth), 'PP')}
                    </Typography>
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
                  <Typography variant="body1">{claim.insuranceProvider}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Policy Number
                  </Typography>
                  <Typography variant="body1">{claim.policyNumber}</Typography>
                </Grid>
                {claim.patient.insuranceProvider && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Patient's Insurance Provider
                    </Typography>
                    <Typography variant="body1">
                      {claim.patient.insuranceProvider}
                    </Typography>
                  </Grid>
                )}
                {claim.patient.insurancePolicyNo && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Patient's Policy Number
                    </Typography>
                    <Typography variant="body1">
                      {claim.patient.insurancePolicyNo}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Treatment Information */}
        {claim.treatment && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Treatment Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Treatment Code
                    </Typography>
                    <Typography variant="body1">{claim.treatment.treatmentCode}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Treatment Name
                    </Typography>
                    <Typography variant="body1">{claim.treatment.treatmentName}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Estimated Cost
                    </Typography>
                    <Typography variant="body1">
                      ${Number(claim.treatment.estimatedCost || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Dentist
                    </Typography>
                    <Typography variant="body1">
                      Dr. {claim.treatment.dentist.firstName} {claim.treatment.dentist.lastName}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Claim Amounts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Claim Amounts
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Claimed Amount
                  </Typography>
                  <Typography variant="h5" color="primary">
                    ${Number(claim.claimedAmount || 0).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Approved Amount
                  </Typography>
                  <Typography variant="body1">
                    {claim.approvedAmount ? `$${Number(claim.approvedAmount).toFixed(2)}` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Paid Amount
                  </Typography>
                  <Typography variant="body1">
                    {claim.paidAmount ? `$${Number(claim.paidAmount).toFixed(2)}` : 'N/A'}
                  </Typography>
                </Grid>
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
                    Submitted Date
                  </Typography>
                  <Typography variant="body1">
                    {claim.submittedDate
                      ? format(new Date(claim.submittedDate), 'PPP')
                      : 'Not submitted'}
                  </Typography>
                </Grid>
                {claim.approvedDate && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Approved Date
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(claim.approvedDate), 'PPP')}
                    </Typography>
                  </Grid>
                )}
                {claim.deniedDate && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Denied Date
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(claim.deniedDate), 'PPP')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Denial Reason */}
        {claim.denialReason && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Denial Reason
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={generatingAppeal ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                    onClick={handleGenerateAppealLetter}
                    disabled={generatingAppeal}
                    color="secondary"
                  >
                    {generatingAppeal ? 'Generating...' : 'AI Generate Appeal Letter'}
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
                  {claim.denialReason}
                </Alert>

                {appealLetter && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Appeal letter generated successfully. You can edit it before sending.
                    </Alert>
                    <TextField
                      fullWidth
                      multiline
                      rows={20}
                      value={appealLetter}
                      onChange={(e) => setAppealLetter(e.target.value)}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                    <Box display="flex" gap={2} mt={2}>
                      <Button
                        variant="contained"
                        onClick={() => {
                          navigator.clipboard.writeText(appealLetter)
                          alert('Appeal letter copied to clipboard!')
                        }}
                      >
                        Copy to Clipboard
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          const blob = new Blob([appealLetter], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `Appeal_Letter_${claim.claimNumber}.txt`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        Download Letter
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Notes */}
        {claim.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {claim.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
