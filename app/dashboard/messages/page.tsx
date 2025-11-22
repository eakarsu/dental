'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
  Grid,
  Divider,
  IconButton,
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
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [openNewMessage, setOpenNewMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    // Since we don't have a messages API endpoint yet, show sample data
    const sampleMessages: Message[] = [
      {
        id: '1',
        subject: 'Patient Follow-up Required',
        body: 'Please follow up with Michael Anderson regarding his upcoming root canal appointment.',
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          role: 'RECEPTIONIST',
        },
      },
      {
        id: '2',
        subject: 'Insurance Pre-authorization Approved',
        body: 'The pre-authorization for Jennifer Martinez\'s crown procedure has been approved by Aetna.',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        sender: {
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
        },
      },
      {
        id: '3',
        subject: 'Schedule Update',
        body: 'Tomorrow\'s morning appointments have been rescheduled due to emergency. Please check the updated calendar.',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        sender: {
          firstName: 'John',
          lastName: 'Smith',
          role: 'DENTIST',
        },
      },
    ]
    setMessages(sampleMessages)
  }, [])

  const handleMarkAsRead = (messageId: string) => {
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ))
  }

  const handleSendMessage = () => {
    // This would call the API to send a message
    console.log('Sending message:', newMessage)
    setOpenNewMessage(false)
    setNewMessage({ recipientId: '', subject: '', body: '' })
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

      <Grid container spacing={3}>
        {/* Message List */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ height: 600, overflow: 'auto' }}>
            <List>
              {messages.map((message, index) => (
                <Box key={message.id}>
                  <ListItem
                    component="button"
                    selected={selectedMessage?.id === message.id}
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
                  <IconButton size="small" color="error">
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
              fullWidth
              label="Recipient"
              value={newMessage.recipientId}
              onChange={(e) =>
                setNewMessage({ ...newMessage, recipientId: e.target.value })
              }
              placeholder="Select recipient"
              sx={{ mb: 2 }}
            />
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
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
