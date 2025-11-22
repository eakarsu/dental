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
  TextField,
  MenuItem,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { format } from 'date-fns'

export default function ClaimsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchClaims()
  }, [statusFilter])

  const fetchClaims = async () => {
    try {
      const url = statusFilter === 'ALL'
        ? '/api/claims'
        : `/api/claims?status=${statusFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setClaims(data || [])
      }
    } catch (error) {
      console.error('Error fetching claims:', error)
    } finally {
      setLoading(false)
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

  const columns: GridColDef[] = [
    {
      field: 'claimNumber',
      headerName: 'Claim #',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500} color="primary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'patientName',
      headerName: 'Patient',
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row) =>
        `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`,
    },
    {
      field: 'insuranceProvider',
      headerName: 'Insurance Provider',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ')}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'submittedDate',
      headerName: 'Submitted',
      width: 120,
      valueFormatter: (value) =>
        value ? format(new Date(value), 'MM/dd/yyyy') : '-',
    },
    {
      field: 'claimedAmount',
      headerName: 'Claimed',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => `$${Number(value || 0).toFixed(2)}`,
    },
    {
      field: 'approvedAmount',
      headerName: 'Approved',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) =>
        value ? `$${Number(value).toFixed(2)}` : '-',
    },
    {
      field: 'paidAmount',
      headerName: 'Paid',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) =>
        value ? `$${Number(value).toFixed(2)}` : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() => router.push(`/dashboard/claims/${params.row.id}`)}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={500}>
          Insurance Claims
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/dashboard/claims/new')}
        >
          New Claim
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="ALL">All Claims</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="SUBMITTED">Submitted</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="PARTIALLY_APPROVED">Partially Approved</MenuItem>
          <MenuItem value="DENIED">Denied</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'submittedDate', sort: 'desc' }],
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
    </Box>
  )
}
