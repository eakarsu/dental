'use client'
import DentalAIPresetButtons from '@/components/DentalAIPresetButtons'


import { useDentalAILauncher } from '@/lib/dental-ai-launcher'
import { useState, useEffect, useMemo, useRef } from 'react'
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
  const openAI = useDentalAILauncher()
  const [appointments, setAppointments] = useState<CalendarEvent[]>([])
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({})
  const loadVersion = useRef(0)
  const recordLoadError = (key: string, message: string) => setLoadErrors(previous => ({ ...previous, [key]: message }))
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [openDialog, setOpenDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view')
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [detailDraft, setDetailDraft] = useState({
    type: 'CHECKUP',
    status: 'SCHEDULED',
    reason: '',
    notes: '',
    roomNumber: '',
  })
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
      const response = await fetch('/api/patients?limit=100')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load patients')
      if (!Array.isArray(data.patients)) throw new Error('Unable to load patients: invalid response')
      setPatients(data.patients)
      recordLoadError('patients', '')
    } catch (error) {
      recordLoadError('patients', error instanceof Error ? error.message : 'Unable to load patients')
    }
  }

  const fetchDentists = async () => {
    try {
      const response = await fetch('/api/users?role=DENTIST')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load dentists')
      if (!Array.isArray(data.users)) throw new Error('Unable to load dentists: invalid response')
      setDentists(data.users)
      recordLoadError('dentists', '')
    } catch (error) {
      recordLoadError('dentists', error instanceof Error ? error.message : 'Unable to load dentists')
    }
  }

  const fetchAppointments = async () => {
    const version = ++loadVersion.current
    try {
      const startDate = moment(date).startOf(view as any).toISOString()
      const endDate = moment(date).endOf(view as any).toISOString()

      const response = await fetch(
        `/api/appointments?startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Unable to load appointments')
      if (!Array.isArray(data)) throw new Error('Unable to load appointments: invalid response')
      const events: CalendarEvent[] = data.map((apt: any) => ({
        id: apt.id,
        title: `${apt.patient.firstName} ${apt.patient.lastName} - ${apt.type}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
      }))

      if (version === loadVersion.current) { setAppointments(events); recordLoadError('appointments', '') }
    } catch (error) {
      if (version === loadVersion.current) recordLoadError('appointments', error instanceof Error ? error.message : 'Unable to load appointments')
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
    const appointment = event.resource
    setSelectedAppointment(appointment)
    setDetailDraft({
      type: appointment.type,
      status: appointment.status,
      reason: appointment.reason || '',
      notes: appointment.notes || '',
      roomNumber: appointment.roomNumber || '',
    })
    setDetailMode('view')
    setDetailError('')
    setDeleteArmed(false)
    setOpenViewDialog(true)
  }

  const closeDetail = () => {
    if (detailBusy) return
    setOpenViewDialog(false)
    setSelectedAppointment(null)
    setDetailMode('view')
    setDetailError('')
    setDeleteArmed(false)
  }

  const handleSaveDetail = async () => {
    if (!selectedAppointment || detailBusy) return
    setDetailBusy(true)
    setDetailError('')
    try {
      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailDraft),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to update appointment')
      setSelectedAppointment(body)
      setAppointments(current => current.map(event => event.id === body.id ? {
        ...event,
        title: `${body.patient.firstName} ${body.patient.lastName} - ${body.type}`,
        start: new Date(body.startTime),
        end: new Date(body.endTime),
        resource: body,
      } : event))
      setDetailMode('view')
      setDeleteArmed(false)
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to update appointment')
    } finally {
      setDetailBusy(false)
    }
  }

  const handleDeleteDetail = async () => {
    if (!selectedAppointment || detailBusy) return
    if (!deleteArmed) {
      setDeleteArmed(true)
      setDetailError('')
      return
    }
    setDetailBusy(true)
    setDetailError('')
    try {
      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to delete appointment')
      setAppointments(current => current.filter(event => event.id !== selectedAppointment.id))
      setOpenViewDialog(false)
      setSelectedAppointment(null)
      setDetailMode('view')
      setDeleteArmed(false)
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to delete appointment')
    } finally {
      setDetailBusy(false)
    }
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

  const handleGenerateCommunication = () => openAI('generate-communication', {sourcePatientId:formData.patientId||selectedAppointment?.patientId||selectedAppointment?.patient?.id,sourceAppointmentId:selectedAppointment?.id,type:communicationType})

  const handleSmartSchedule = () => openAI('smart-scheduling', {sourcePatientId:formData.patientId,patientId:formData.patientId,dentistId:formData.dentistId,treatmentType:formData.type})

  const handlePredictNoShows = () => openAI('predict-no-show', {})

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

      {Object.entries(loadErrors).filter(([, message]) => message).map(([key, message]) => <Alert key={key} severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => { if (key === 'patients') void fetchPatients(); else if (key === 'dentists') void fetchDentists(); else void fetchAppointments() }}>Retry</Button>}>{message}</Alert>)}
      {!loadErrors.appointments && <Box sx={{ height: 700, bgcolor: 'white', p: 2, borderRadius: 1 }}>
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
      </Box>}

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
      <Dialog open={openViewDialog} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>{detailMode === 'edit' ? 'Edit Appointment' : 'Appointment Details'}</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Grid container spacing={2} sx={{ mt: 1 }} data-native-record-detail="appointment">
              {detailError && <Grid item xs={12}><Alert severity="error">{detailError}</Alert></Grid>}
              {deleteArmed && <Grid item xs={12}><Alert severity="warning">Delete this appointment? Confirm delete removes this native record. Related records can prevent deletion.</Alert></Grid>}
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
                {detailMode === 'edit' ? (
                  <TextField fullWidth select size="small" aria-label="Appointment type" value={detailDraft.type} onChange={event => setDetailDraft(current => ({ ...current, type: event.target.value }))}>
                    {['CHECKUP','CLEANING','CONSULTATION','FILLING','ROOT_CANAL','EXTRACTION','CROWN','BRIDGE','IMPLANT','ORTHODONTICS','EMERGENCY','FOLLOW_UP'].map(value => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}
                  </TextField>
                ) : <Chip label={selectedAppointment.type} size="small" />}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                {detailMode === 'edit' ? (
                  <TextField fullWidth select size="small" aria-label="Appointment status" value={detailDraft.status} onChange={event => setDetailDraft(current => ({ ...current, status: event.target.value }))}>
                    {['SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'].map(value => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}
                  </TextField>
                ) : <Chip
                  label={selectedAppointment.status}
                  size="small"
                  color={
                    selectedAppointment.status === 'CONFIRMED' ? 'success' :
                    selectedAppointment.status === 'COMPLETED' ? 'default' :
                    selectedAppointment.status === 'CANCELLED' ? 'error' :
                    'primary'
                  }
                />}
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

              {(detailMode === 'edit' || selectedAppointment.reason) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                  {detailMode === 'edit' ? <TextField fullWidth multiline minRows={2} aria-label="Appointment reason" value={detailDraft.reason} onChange={event => setDetailDraft(current => ({ ...current, reason: event.target.value }))} /> : <Typography variant="body1">{selectedAppointment.reason}</Typography>}
                </Grid>
              )}

              {(detailMode === 'edit' || selectedAppointment.notes) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  {detailMode === 'edit' ? <TextField fullWidth multiline minRows={2} aria-label="Appointment notes" value={detailDraft.notes} onChange={event => setDetailDraft(current => ({ ...current, notes: event.target.value }))} /> : <Typography variant="body1">{selectedAppointment.notes}</Typography>}
                </Grid>
              )}

              {(detailMode === 'edit' || selectedAppointment.roomNumber) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Room Number</Typography>
                  {detailMode === 'edit' ? <TextField fullWidth size="small" aria-label="Appointment room number" value={detailDraft.roomNumber} onChange={event => setDetailDraft(current => ({ ...current, roomNumber: event.target.value }))} /> : <Typography variant="body1">{selectedAppointment.roomNumber}</Typography>}
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
                      <Box sx={{minWidth:0}}><Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={aiGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        onClick={handleGenerateCommunication}
                        disabled={aiGenerating}
                        color="secondary"
                      >
                        {aiGenerating ? 'Generating...' : 'Generate'}
                      </Button><DentalAIPresetButtons tool="generate-communication" input={{sourcePatientId:formData.patientId||selectedAppointment?.patientId||selectedAppointment?.patient?.id,sourceAppointmentId:selectedAppointment?.id,type:communicationType}} disabled={aiGenerating}/></Box>
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
          <Button disabled={detailBusy} onClick={() => detailMode === 'edit' ? void handleSaveDetail() : setDetailMode('edit')}>{detailMode === 'edit' ? 'Save changes' : 'Edit'}</Button>
          <Button color="error" disabled={detailBusy} onClick={() => void handleDeleteDetail()}>{deleteArmed ? 'Confirm delete' : 'Delete'}</Button>
          <Button disabled={detailBusy} onClick={closeDetail}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
