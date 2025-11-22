'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import EventIcon from '@mui/icons-material/Event'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PersonIcon from '@mui/icons-material/Person'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { format } from 'date-fns'
import { Button, Alert, CircularProgress } from '@mui/material'

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  pendingClaims: number
  monthlyRevenue: number
  upcomingAppointments: any[]
  recentPatients: any[]
}

interface AIInsight {
  title: string
  description: string
  type: 'positive' | 'warning' | 'info'
  actionable?: string
}

interface RevenueForecast {
  month: string
  projectedRevenue: number
  confidence: string
  factors: string[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [revenueForecast, setRevenueForecast] = useState<any>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastMonths, setForecastMonths] = useState(3)
  const [forecastError, setForecastError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchDashboardStats()
    }
  }, [status, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Set empty stats to prevent crashes
      setStats({
        totalPatients: 0,
        todayAppointments: 0,
        pendingClaims: 0,
        monthlyRevenue: 0,
        upcomingAppointments: [],
        recentPatients: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAiInsights = async () => {
    setAiLoading(true)
    try {
      console.log('[AI Insights] Fetching insights...')
      const response = await fetch('/api/ai/dashboard-insights')
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights')
      }
      const data = await response.json()
      console.log('[AI Insights] Received insights:', data)
      setAiInsights(data.insights || [])
    } catch (error) {
      console.error('[AI Insights] Error:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchRevenueForecast = async () => {
    setForecastLoading(true)
    setForecastError(null)
    try {
      console.log('[Revenue Forecast] Fetching forecast for', forecastMonths, 'months...')
      const response = await fetch('/api/ai/revenue-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: forecastMonths }),
      })

      const data = await response.json()
      console.log('[Revenue Forecast] Response status:', response.status)
      console.log('[Revenue Forecast] Response data:', data)

      if (!response.ok) {
        const errorMsg = data.details || data.error || 'Failed to fetch revenue forecast'
        throw new Error(errorMsg)
      }

      setRevenueForecast(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Revenue Forecast] Error:', errorMessage)
      setForecastError(errorMessage)
    } finally {
      setForecastLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography variant="h6">Loading dashboard...</Typography>
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect to login
  }

  if (!stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography variant="h6" color="error">Failed to load dashboard data</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={500} mb={3}>
        Dashboard Overview
      </Typography>

      {/* AI Insights Widget */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6" fontWeight={500}>
              AI Practice Insights
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={aiLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={fetchAiInsights}
            disabled={aiLoading}
            color="secondary"
          >
            {aiLoading ? 'Generating...' : 'Generate Insights'}
          </Button>
        </Box>

        {aiInsights.length > 0 ? (
          <Grid container spacing={2}>
            {aiInsights.map((insight, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="flex-start" gap={2}>
                      <Box sx={{ mt: 0.5 }}>{getInsightIcon(insight.type)}</Box>
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          {insight.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {insight.description}
                        </Typography>
                        {insight.actionable && (
                          <Box
                            sx={{
                              bgcolor: 'action.hover',
                              p: 1.5,
                              borderRadius: 1,
                              mt: 1,
                            }}
                          >
                            <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                              Recommended Action:
                            </Typography>
                            <Typography variant="body2">{insight.actionable}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            Click "Generate Insights" to get AI-powered recommendations for your practice based on current statistics.
          </Alert>
        )}
      </Paper>

      {/* Revenue Forecast Widget */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUpIcon sx={{ color: 'success.main' }} />
            <Typography variant="h6" fontWeight={500}>
              AI Revenue Forecast
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Select
              size="small"
              value={forecastMonths}
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              disabled={forecastLoading}
            >
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months</MenuItem>
              <MenuItem value={12}>12 Months</MenuItem>
            </Select>
            <Button
              variant="outlined"
              size="small"
              startIcon={forecastLoading ? <CircularProgress size={16} /> : <TrendingUpIcon />}
              onClick={fetchRevenueForecast}
              disabled={forecastLoading}
              color="success"
            >
              {forecastLoading ? 'Generating...' : 'Generate Forecast'}
            </Button>
          </Box>
        </Box>

        {forecastError ? (
          <Alert severity="error">
            <Typography variant="subtitle2" fontWeight={600}>Error Loading Forecast</Typography>
            <Typography variant="body2">{forecastError}</Typography>
          </Alert>
        ) : revenueForecast ? (
          <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined" sx={{ bgcolor: 'success.lighter', borderColor: 'success.main' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Total Projected
                    </Typography>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      ${revenueForecast.summary?.totalProjected?.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Growth Rate
                    </Typography>
                    <Typography variant="h5" fontWeight={600} color="primary.main">
                      {revenueForecast.summary?.growthRate?.toFixed(1) || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Confidence
                    </Typography>
                    <Chip
                      label={revenueForecast.summary?.confidence || 'N/A'}
                      color={
                        revenueForecast.summary?.confidence === 'high'
                          ? 'success'
                          : revenueForecast.summary?.confidence === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Forecast Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Month</strong></TableCell>
                    <TableCell><strong>Projected Revenue</strong></TableCell>
                    <TableCell><strong>Confidence</strong></TableCell>
                    <TableCell><strong>Key Factors</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenueForecast.forecast?.map((item: RevenueForecast, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.month}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          ${item.projectedRevenue?.toLocaleString() || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.confidence}
                          size="small"
                          color={
                            item.confidence === 'high'
                              ? 'success'
                              : item.confidence === 'medium'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {item.factors?.[0] || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Insights and Recommendations */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {revenueForecast.insights && revenueForecast.insights.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Key Insights
                    </Typography>
                    <List dense>
                      {revenueForecast.insights.map((insight: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={insight}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Grid>
              )}
              {revenueForecast.recommendations && revenueForecast.recommendations.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Recommendations
                    </Typography>
                    <List dense>
                      {revenueForecast.recommendations.map((rec: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={rec}
                            primaryTypographyProps={{ variant: 'body2', color: 'primary' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Grid>
              )}
            </Grid>

            {revenueForecast.risks && revenueForecast.risks.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Potential Risks
                </Typography>
                {revenueForecast.risks.map((risk: string, index: number) => (
                  <Typography key={index} variant="body2">
                    • {risk}
                  </Typography>
                ))}
              </Alert>
            )}
          </Box>
        ) : (
          <Alert severity="info">
            Select a forecast period and click "Generate Forecast" to get AI-powered revenue projections based on historical data and trends.
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Patients
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.totalPatients}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <EventIcon />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Today's Appointments
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.todayAppointments}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Pending Claims
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.pendingClaims}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <AttachMoneyIcon />
                </Avatar>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    ${stats.monthlyRevenue.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={500} mb={2}>
              Upcoming Appointments
            </Typography>
            <List>
              {stats.upcomingAppointments.map((appointment) => (
                <ListItem key={appointment.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
                    secondary={
                      <>
                        <Typography variant="caption" display="block" component="span">
                          {format(new Date(appointment.startTime), 'PPp')}
                        </Typography>
                        <Chip
                          label={appointment.type}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </>
                    }
                    secondaryTypographyProps={{ component: 'span' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={500} mb={2}>
              Recent Patients
            </Typography>
            <List>
              {stats.recentPatients.map((patient) => (
                <ListItem key={patient.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}>
                      {patient.firstName.charAt(0)}
                      {patient.lastName.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${patient.firstName} ${patient.lastName}`}
                    secondary={
                      <>
                        <Typography variant="caption" display="block" component="span">
                          {patient.phone}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" component="span">
                          Added {format(new Date(patient.createdAt), 'PP')}
                        </Typography>
                      </>
                    }
                    secondaryTypographyProps={{ component: 'span' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
