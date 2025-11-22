'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { format } from 'date-fns'

export default function TreatmentsPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(true)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [treatmentSummary, setTreatmentSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    fetchTreatments()
  }, [])

  const fetchTreatments = async () => {
    try {
      const response = await fetch('/api/treatments')
      if (response.ok) {
        const data = await response.json()
        setTreatments(data || [])
      }
    } catch (error) {
      console.error('Error fetching treatments:', error)
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

  const getChecklistProgress = (checklist: any) => {
    if (!checklist || !checklist.items) return 0
    const items = checklist.items
    const completed = items.filter((item: any) => item.completed).length
    return (completed / items.length) * 100
  }

  const handleGenerateTreatmentSummary = async () => {
    if (treatments.length === 0) return

    setGeneratingSummary(true)
    setSummaryDialogOpen(true)

    try {
      // Get first patient's name if available
      const firstPatient = treatments[0] as any
      const patientName = firstPatient?.patient
        ? `${firstPatient.patient.firstName} ${firstPatient.patient.lastName}`
        : 'Patient'

      const totalCost = treatments.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0)

      const response = await fetch('/api/ai/treatment-plan-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatments: treatments.map((t: any) => ({
            treatmentCode: t.treatmentCode,
            treatmentName: t.treatmentName,
            toothNumber: t.toothNumber,
            estimatedCost: t.estimatedCost,
            description: t.description,
          })),
          patientName,
          totalCost,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setTreatmentSummary(data.summary)
    } catch (error) {
      console.error('[Treatment Summary] Error:', error)
      setTreatmentSummary('Failed to generate treatment plan summary. Please try again.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'patientName',
      headerName: 'Patient',
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row) =>
        `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`,
    },
    {
      field: 'treatmentName',
      headerName: 'Treatment',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'treatmentCode',
      headerName: 'CDT Code',
      width: 100,
    },
    {
      field: 'toothNumber',
      headerName: 'Tooth #',
      width: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'dentistName',
      headerName: 'Dentist',
      flex: 1,
      minWidth: 150,
      valueGetter: (value, row) =>
        `Dr. ${row.dentist?.lastName || ''}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 120,
      renderCell: (params) => {
        const progress = getChecklistProgress(params.row.checklist)
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption">{Math.round(progress)}%</Typography>
          </Box>
        )
      },
    },
    {
      field: 'estimatedCost',
      headerName: 'Cost',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => `$${Number(value || 0).toFixed(2)}`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => router.push(`/dashboard/treatments/${params.row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() =>
              router.push(`/dashboard/treatments/${params.row.id}/edit`)
            }
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={500}>
          Treatment Plans
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerateTreatmentSummary}
            disabled={treatments.length === 0}
            color="secondary"
          >
            AI Summary
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/treatments/new')}
          >
            New Treatment
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={treatments}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>

      {/* Treatment Plan Summary Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Treatment Plan Summary</DialogTitle>
        <DialogContent>
          {generatingSummary ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Generating patient-friendly summary...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', p: 2 }}>
              {treatmentSummary}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(treatmentSummary)
            }}
            disabled={generatingSummary}
          >
            Copy
          </Button>
          <Button onClick={() => setSummaryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
