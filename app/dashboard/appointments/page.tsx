'use client'

import { useState, useEffect, useMemo } from 'react'
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, GridLegacy as Grid, Chip, Autocomplete, Alert, CircularProgress } from '@mui/material'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { DateTimePicker } from '@mui/x-date-pickers'

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

const localizer = momentLocalizer(moment)

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: any
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [openDialog, setOpenDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [communicationType, setCommunicationType] = useState('appointment_reminder')
  const [smartScheduleLoading, setSmartScheduleLoading] = useState(false)
  const [scheduleSuggestions, setScheduleSuggestions] = useState<any>(null)
  const [noShowPredictions, setNoShowPredictions] = useState<any>(null)
  const [formData, setFormData] = useState({
    patientId: '',
    dentistId: '',
    type: 'CHECKUP',
    startTime: new Date(),
    endTime: new Date(),
    reason: '',
  })

  useEffect(() => {
    fetchAppointments()
    fetchPatients()
    fetchDentists()
  }, [date, view])

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

  const fetchAppointments = async () => {
    try {
      const startDate = moment(date).startOf(view as any).toISOString()
      const endDate = moment(date).endOf(view as any).toISOString()

      const response = await fetch(
        `/api/appointments?startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()

      const events: CalendarEvent[] = data.map((apt: any) => ({
        id: apt.id,
        title: `${apt.patient.firstName} ${apt.patient.lastName} - ${apt.type}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
      }))

      setAppointments(events)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot(slotInfo)
    setSelectedPatient(null)
    setSelectedDentist(null)
    setFormData({
      patientId: '',
      dentistId: '',
      type: 'CHECKUP',
      startTime: slotInfo.start,
      endTime: slotInfo.end,
      reason: '',
    })
    setOpenDialog(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource)
    setOpenViewDialog(true)
  }

  const handleOpenDialog = () => {
    setSelectedPatient(null)
    setSelectedDentist(null)
    setFormData({
      patientId: '',
      dentistId: '',
      type: 'CHECKUP',
      startTime: new Date(),
      endTime: new Date(),
      reason: '',
    })
    setOpenDialog(true)
  }

  const handleSaveAppointment = async () => {
    try {
      console.log('Submitting appointment with formData:', formData)
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const createdAppointment = await response.json()
        setOpenDialog(false)
        setSelectedPatient(null)
        setSelectedDentist(null)

        // Navigate calendar to the appointment's date
        const appointmentDate = new Date(createdAppointment.startTime)
        setDate(appointmentDate)

        // Fetch appointments after a short delay to ensure the new one is included
        setTimeout(() => {
          fetchAppointments()
        }, 500)

        setFormData({
          patientId: '',
          dentistId: '',
          type: 'CHECKUP',
          startTime: new Date(),
          endTime: new Date(),
          reason: '',
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to create appointment:', errorData)
        alert(`Failed to create appointment: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error creating appointment. Please try again.')
    }
  }

  const handleGenerateCommunication = async () => {
    if (!selectedAppointment) return

    setAiGenerating(true)
    setGeneratedMessage('')

    try {
      console.log('[AI Communication] Generating message...')
      const response = await fetch('/api/ai/generate-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: communicationType,
          patientName: `${selectedAppointment.patient.firstName} ${selectedAppointment.patient.lastName}`,
          appointmentDate: selectedAppointment.startTime,
          treatmentType: selectedAppointment.type,
          amountDue: selectedAppointment.amountDue,
          lastTreatmentDate: selectedAppointment.completionDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate communication')
      }

      const data = await response.json()
      setGeneratedMessage(data.generatedMessage)
    } catch (error) {
      console.error('[AI Communication] Error:', error)
      setGeneratedMessage('Failed to generate message. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSmartSchedule = async () => {
    if (!selectedPatient || !formData.type) return

    setSmartScheduleLoading(true)
    try {
      const response = await fetch('/api/ai/smart-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentType: formData.type,
          patientId: selectedPatient.id,
          dentistId: selectedDentist?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to get schedule suggestions')

      const data = await response.json()
      setScheduleSuggestions(data)
    } catch (error) {
      console.error('[Smart Schedule] Error:', error)
    } finally {
      setSmartScheduleLoading(false)
    }
  }

  const handlePredictNoShows = async () => {
    try {
      const response = await fetch('/api/ai/predict-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('Failed to predict no-shows')

      const data = await response.json()
      setNoShowPredictions(data)
    } catch (error) {
      console.error('[No-Show Prediction] Error:', error)
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource?.status
    let backgroundColor = '#1976d2'

    switch (status) {
      case 'CONFIRMED':
        backgroundColor = '#2e7d32'
        break
      case 'IN_PROGRESS':
        backgroundColor = '#ed6c02'
        break
      case 'COMPLETED':
        backgroundColor = '#757575'
        break
      case 'CANCELLED':
        backgroundColor = '#d32f2f'
        break
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={500}>
          Appointment Calendar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          New Appointment
        </Button>
      </Box>

      <Box sx={{ height: 700, bgcolor: 'white', p: 2, borderRadius: 1 }}>
        <Calendar
          localizer={localizer}
          events={appointments}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          style={{ height: '100%' }}
        />
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Appointment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${option.phone}`}
                value={selectedPatient}
                onChange={(event, newValue) => {
                  setSelectedPatient(newValue)
                  setFormData({ ...formData, patientId: newValue?.id || '' })
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Select Patient" required />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={dentists}
                getOptionLabel={(option) => `Dr. ${option.firstName} ${option.lastName}`}
                value={selectedDentist}
                onChange={(event, newValue) => {
                  setSelectedDentist(newValue)
                  setFormData({ ...formData, dentistId: newValue?.id || '' })
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Select Dentist" required />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Appointment Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="CHECKUP">Checkup</MenuItem>
                <MenuItem value="CLEANING">Cleaning</MenuItem>
                <MenuItem value="CONSULTATION">Consultation</MenuItem>
                <MenuItem value="FILLING">Filling</MenuItem>
                <MenuItem value="ROOT_CANAL">Root Canal</MenuItem>
                <MenuItem value="EXTRACTION">Extraction</MenuItem>
                <MenuItem value="CROWN">Crown</MenuItem>
                <MenuItem value="EMERGENCY">Emergency</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(value) => value && setFormData({ ...formData, startTime: value })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(value) => value && setFormData({ ...formData, endTime: value })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveAppointment} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Appointment Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Appointment Details</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                <Typography variant="body1">
                  {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAppointment.patient.phone}
                </Typography>
              </Grid>

              {selectedAppointment.dentist && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Dentist</Typography>
                  <Typography variant="body1">
                    Dr. {selectedAppointment.dentist.firstName} {selectedAppointment.dentist.lastName}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                <Chip label={selectedAppointment.type} size="small" />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedAppointment.status}
                  size="small"
                  color={
                    selectedAppointment.status === 'CONFIRMED' ? 'success' :
                    selectedAppointment.status === 'COMPLETED' ? 'default' :
                    selectedAppointment.status === 'CANCELLED' ? 'error' :
                    'primary'
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Start Time</Typography>
                <Typography variant="body1">
                  {new Date(selectedAppointment.startTime).toLocaleString()}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">End Time</Typography>
                <Typography variant="body1">
                  {new Date(selectedAppointment.endTime).toLocaleString()}
                </Typography>
              </Grid>

              {selectedAppointment.reason && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                  <Typography variant="body1">{selectedAppointment.reason}</Typography>
                </Grid>
              )}

              {selectedAppointment.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{selectedAppointment.notes}</Typography>
                </Grid>
              )}

              {selectedAppointment.roomNumber && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Room Number</Typography>
                  <Typography variant="body1">{selectedAppointment.roomNumber}</Typography>
                </Grid>
              )}

              {/* AI Generate Communication */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="subtitle2" fontWeight={600}>
                      AI Generate Patient Communication
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        select
                        size="small"
                        label="Message Type"
                        value={communicationType}
                        onChange={(e) => setCommunicationType(e.target.value)}
                      >
                        <MenuItem value="appointment_reminder">Appointment Reminder</MenuItem>
                        <MenuItem value="post_treatment">Post-Treatment Instructions</MenuItem>
                        <MenuItem value="payment_reminder">Payment Reminder</MenuItem>
                        <MenuItem value="follow_up">Follow-Up Check-In</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={aiGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        onClick={handleGenerateCommunication}
                        disabled={aiGenerating}
                        color="secondary"
                      >
                        {aiGenerating ? 'Generating...' : 'Generate'}
                      </Button>
                    </Grid>

                    {generatedMessage && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={6}
                          label="Generated Message"
                          value={generatedMessage}
                          onChange={(e) => setGeneratedMessage(e.target.value)}
                          helperText="You can edit this message before sending it to the patient"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
