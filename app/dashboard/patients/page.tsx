'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  Chip,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import { format } from 'date-fns'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const loadVersion = useRef(0)
  const [search, setSearch] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 })
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchPatients()
  }, [search, paginationModel.page, paginationModel.pageSize])

  const fetchPatients = async () => {
    const version = ++loadVersion.current
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch(`/api/patients?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load patients')
      const rows = body.patients
      if (!Array.isArray(rows) || !Number.isInteger(body.pagination?.total) || body.pagination.total < 0) throw new Error('Unable to load patients: invalid response')
      if (version === loadVersion.current) { setPatients(rows); setTotal(body.pagination.total) }
    } catch (error) {
      if (version === loadVersion.current) setLoadError(error instanceof Error ? error.message : 'Unable to load patients')
    } finally {
      if (version === loadVersion.current) setLoading(false)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'fullName',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row) => `${row.firstName} ${row.lastName}`,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'dateOfBirth',
      headerName: 'Date of Birth',
      flex: 1,
      minWidth: 130,
      valueFormatter: (value) => format(new Date(value), 'MM/dd/yyyy'),
    },
    {
      field: 'insuranceProvider',
      headerName: 'Insurance',
      flex: 1,
      minWidth: 150,
      renderCell: (params) =>
        params.value ? (
          <Chip label={params.value} size="small" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            None
          </Typography>
        ),
    },
    {
      field: 'appointments',
      headerName: 'Appointments',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => row._count?.appointments || 0,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => router.push(`/dashboard/patients/${params.row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() =>
              router.push(`/dashboard/patients/${params.row.id}/edit`)
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
          Patients
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/dashboard/patients/new')}
        >
          Add Patient
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search patients by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPaginationModel(previous => ({ ...previous, page: 0 })) }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loadError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={fetchPatients} disabled={loading}>Retry</Button>}>{loadError}</Alert>}
      {!loadError && <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={patients}
          columns={columns}
          loading={loading}
          pageSizeOptions={[15, 25, 50]}
          paginationMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
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
    </Box>
  )
}
