'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Fab,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'What are your office hours?',
    'Do you accept my insurance?',
    'How much does a root canal cost?',
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (question?: string) => {
    const messageToSend = question || input
    if (!messageToSend.trim() || loading) return

    const userMessage: Message = { role: 'user', content: messageToSend }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageToSend,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.answer }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.suggestedFollowUps) {
        setSuggestedQuestions(data.suggestedFollowUps)
      }
    } catch (error) {
      console.error('[Chatbot] Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again or call our office.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="secondary"
        aria-label="chat"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        {isOpen ? <CloseIcon /> : <SmartToyIcon />}
      </Fab>

      {/* Chat Window */}
      <Collapse in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 380,
            maxWidth: '90vw',
            height: 500,
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'secondary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <SmartToyIcon />
              <Typography variant="h6" fontWeight={600}>
                Dental Assistant
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: 'background.default',
            }}
          >
            {messages.length === 0 ? (
              <Box textAlign="center" py={4}>
                <SmartToyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Hi! I'm your AI dental assistant. Ask me anything about our practice, procedures, or
                  appointments.
                </Typography>
                <Box mt={2}>
                  <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                    Try asking:
                  </Typography>
                  {suggestedQuestions.map((q, i) => (
                    <Chip
                      key={i}
                      label={q}
                      size="small"
                      onClick={() => handleSend(q)}
                      sx={{ m: 0.5, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <List>
                {messages.map((message, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      px: 0,
                    }}
                  >
                    <Box
                      display="flex"
                      gap={1}
                      alignItems="flex-start"
                      sx={{
                        maxWidth: '85%',
                        flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                        }}
                      >
                        {message.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                      </Avatar>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
            {loading && (
              <Box display="flex" alignItems="center" gap={1} px={2}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Thinking...
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Suggested Questions */}
          {messages.length > 0 && suggestedQuestions.length > 0 && (
            <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Suggested:
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {suggestedQuestions.map((q, i) => (
                  <Chip
                    key={i}
                    label={q}
                    size="small"
                    onClick={() => handleSend(q)}
                    sx={{ cursor: 'pointer' }}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                multiline
                maxRows={3}
                id="chatbot-input"
              />
              <IconButton
                color="primary"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </>
  )
}
