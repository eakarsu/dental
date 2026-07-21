'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  GridLegacy as Grid,
  Divider,
  IconButton,
  Alert,
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import MailIcon from '@mui/icons-material/Mail'
import SendIcon from '@mui/icons-material/Send'
import DeleteIcon from '@mui/icons-material/Delete'
import { format } from 'date-fns'

interface Message {
  id: string
  subject: string
  body: string
  isRead: boolean
  createdAt: string
  sender: {
    firstName: string
    lastName: string
    role: string
  }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [recipients, setRecipients] = useState<Array<{ id: string; firstName: string; lastName: string; role: string }>>([])
  const [error, setError] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [openNewMessage, setOpenNewMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    Promise.all([fetch('/api/messages'), fetch('/api/users')])
      .then(async ([messageResponse, userResponse]) => {
        const [messageBody, userBody] = await Promise.all([messageResponse.json(), userResponse.json()])
        if (!messageResponse.ok || !userResponse.ok) throw new Error(messageBody.error ?? userBody.error ?? 'Unable to load messages')
        setMessages(messageBody.messages)
        setRecipients(userBody.users)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load messages'))
  }, [])

  const handleMarkAsRead = async (messageId: string) => {
    const response = await fetch(`/api/messages/${messageId}`, { method: 'PATCH' })
    if (!response.ok) { setError('Unable to mark message as read'); return }
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ))
  }

  const handleSendMessage = async () => {
    const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMessage) })
    const body = await response.json()
    if (!response.ok) { setError(body.error ?? 'Unable to send message'); return }
    setOpenNewMessage(false)
    setNewMessage({ recipientId: '', subject: '', body: '' })
  }

  const handleDelete = async (messageId: string) => {
    const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
    if (!response.ok) { setError('Unable to delete message'); return }
    setMessages(messages.filter((message) => message.id !== messageId))
    setSelectedMessage(null)
  }

  const unreadCount = messages.filter(m => !m.isRead).length

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={500}>
            Messages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewMessage(true)}
        >
          New Message
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Message List */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ height: 600, overflow: 'auto' }}>
            <List>
              {messages.map((message, index) => (
                <Box key={message.id}>
                  <ListItem
                    component="button"
                    onClick={() => {
                      setSelectedMessage(message)
                      if (!message.isRead) {
                        handleMarkAsRead(message.id)
                      }
                    }}
                    sx={{
                      bgcolor: message.isRead ? 'transparent' : 'action.hover',
                      cursor: 'pointer',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      padding: 2,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: message.isRead ? 'grey.400' : 'primary.main' }}>
                        {message.isRead ? <MailOutlineIcon /> : <MailIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="body1"
                            fontWeight={message.isRead ? 400 : 600}
                          >
                            {message.subject}
                          </Typography>
                          {!message.isRead && (
                            <Chip label="New" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" component="span" display="block">
                            From: {message.sender.firstName} {message.sender.lastName}
                          </Typography>
                          <Typography variant="caption" component="span" display="block" color="text.secondary">
                            {format(new Date(message.createdAt), 'PPp')}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < messages.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Message Detail */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ height: 600, p: 3 }}>
            {selectedMessage ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      {selectedMessage.subject}
                    </Typography>
                    <Box display="flex" gap={2} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {selectedMessage.sender.firstName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {selectedMessage.sender.firstName} {selectedMessage.sender.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(selectedMessage.createdAt), 'PPp')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small" color="error" aria-label="Delete message" onClick={() => handleDelete(selectedMessage.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.body}
                </Typography>
              </Box>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Box textAlign="center">
                  <MailOutlineIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select a message to read
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* New Message Dialog */}
      <Dialog
        open={openNewMessage}
        onClose={() => setOpenNewMessage(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Message</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Recipient"
              value={newMessage.recipientId}
              onChange={(e) =>
                setNewMessage({ ...newMessage, recipientId: e.target.value })
              }
              sx={{ mb: 2 }}
            >
              {recipients.map((recipient) => <MenuItem key={recipient.id} value={recipient.id}>{recipient.firstName} {recipient.lastName} ({recipient.role})</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              label="Subject"
              value={newMessage.subject}
              onChange={(e) =>
                setNewMessage({ ...newMessage, subject: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Message"
              value={newMessage.body}
              onChange={(e) =>
                setNewMessage({ ...newMessage, body: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewMessage(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!newMessage.recipientId || !newMessage.subject.trim() || !newMessage.body.trim()}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
