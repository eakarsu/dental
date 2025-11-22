'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Box, Typography, CircularProgress } from '@mui/material'

export default function LogoutPage() {
  useEffect(() => {
    signOut({
      redirect: true,
      callbackUrl: '/login'
    })
  }, [])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="h6">Logging out...</Typography>
    </Box>
  )
}
