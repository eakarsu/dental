'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Stack,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setLoading(false)
      } else if (result?.ok) {
        // Wait a bit for the session cookie to be set
        await new Promise(resolve => setTimeout(resolve, 500))

        // Verify session is set by checking the session endpoint
        const sessionCheck = await fetch('/api/auth/session')
        const session = await sessionCheck.json()

        if (session && session.user) {
          window.location.href = '/dashboard'
        } else {
          setError('Session error. Please try again.')
          setLoading(false)
        }
      } else {
        setError('An unexpected error occurred')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Sign in exception:', error)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 450 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <LocalHospitalIcon
                  sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}
                />
                <Typography variant="h4" component="h1" gutterBottom>
                  Dental Clinic SaaS
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to manage your dental practice
                </Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}

                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    autoComplete="email"
                    autoFocus
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    autoComplete="current-password"
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </Stack>
              </form>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  Demo Users:
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  admin@dentalclinic.com / password123
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  dr.smith@dentalclinic.com / password123
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  receptionist@dentalclinic.com / password123
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
