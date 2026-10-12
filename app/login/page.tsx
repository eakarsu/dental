'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [credentialNotice, setCredentialNotice] = useState('')
  const [demoAvailable, setDemoAvailable] = useState(false)
  const [demoStatusLoading, setDemoStatusLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/demo-status', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || typeof body.available !== 'boolean') throw new Error('Demo status unavailable')
        setDemoAvailable(body.available)
      })
      .catch(() => { if (!controller.signal.aborted) setDemoAvailable(false) })
      .finally(() => { if (!controller.signal.aborted) setDemoStatusLoading(false) })
    return () => controller.abort()
  }, [])

  const performSignIn = async (loginEmail: string, loginPassword: string, provider: 'credentials' | 'demo' = 'credentials') => {
    try {
      const result = provider === 'demo'
        ? await signIn('demo', { redirect: false })
        : await signIn('credentials', { email: loginEmail, password: loginPassword, redirect: false })

      if (result?.error) {
        setError(provider === 'demo' ? 'Demo login is unavailable. Use your account credentials.' : 'Invalid email or password')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCredentialNotice('')
    setLoading(true)
    await performSignIn(email, password)
  }

  const handleDemoSignIn = async () => {
    if (!demoAvailable || loading) return
    setError('')
    setCredentialNotice('Signing in to the configured local demo clinic…')
    setLoading(true)
    await performSignIn('', '', 'demo')
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
                    onChange={(e) => { setEmail(e.target.value); setCredentialNotice('') }}
                    required
                    fullWidth
                    autoComplete="email"
                    autoFocus
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setCredentialNotice('') }}
                    required
                    fullWidth
                    autoComplete="current-password"
                  />

                  <Alert severity="info">
                    {credentialNotice || (demoStatusLoading
                      ? 'Checking configured demo access…'
                      : demoAvailable
                        ? 'Use Demo login for one-click access to the configured local demo clinic. Credentials remain server-side.'
                        : 'Configured demo access is unavailable. Enter your account credentials.')}
                  </Alert>
                  <Button
                    type="button"
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleDemoSignIn}
                    disabled={!demoAvailable || demoStatusLoading || loading}
                  >
                    {loading ? 'Signing in…' : demoStatusLoading ? 'Checking Demo login…' : 'Demo login'}
                  </Button>
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

            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
