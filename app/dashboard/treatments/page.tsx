'use client'
import DentalAIPresetButtons from '@/components/DentalAIPresetButtons'


import { useDentalAILauncher } from '@/lib/dental-ai-launcher'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
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
  const openAI = useDentalAILauncher()
  const router = useRouter()
  const [treatments, setTreatments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const loadVersion = useRef(0)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [treatmentSummary, setTreatmentSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    fetchTreatments()
  }, [])

  const fetchTreatments = async () => {
    const version = ++loadVersion.current
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/treatments', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load treatments')
      const rows = body
      if (!Array.isArray(rows)) throw new Error('Unable to load treatments: invalid response')
      if (version === loadVersion.current) setTreatments(rows)
    } catch (error) {
      if (version === loadVersion.current) setLoadError(error instanceof Error ? error.message : 'Unable to load treatments')
    } finally {
      if (version === loadVersion.current) setLoading(false)
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

  const handleGenerateTreatmentSummary = () => openAI('treatment-plan-summary', {})

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
          <Box sx={{minWidth:0}}><Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerateTreatmentSummary}
            disabled={treatments.length === 0}
            color="secondary"
          >
            AI Summary
          </Button><DentalAIPresetButtons tool="treatment-plan-summary" input={{}}/></Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/treatments/new')}
          >
            New Treatment
          </Button>
        </Box>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={fetchTreatments} disabled={loading}>Retry</Button>}>{loadError}</Alert>}
      {!loadError && <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={treatments}
          columns={columns}
          loading={loading}
          pageSizeOptions={[15, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 15 },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>}

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
