'use client'
import { useState } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { useDentalAILauncher } from '@/lib/dental-ai-launcher'
import DentalAIPresetButtons from './DentalAIPresetButtons'
export default function AIChatbotWidget(){
 const openAI=useDentalAILauncher(),[open,setOpen]=useState(false)
 return <Box sx={{position:'fixed',bottom:24,right:24,zIndex:1200,maxWidth:'calc(100vw - 48px)'}}>
  {open&&<Paper variant="outlined" sx={{p:2,mb:1,width:360,maxWidth:'100%'}}>
   <Typography fontWeight={600}>Dental AI questions</Typography>
   <DentalAIPresetButtons tool="chatbot"/>
   <Button type="button" onClick={()=>openAI('chatbot')}>Open question workspace</Button>
   <Button type="button" onClick={()=>setOpen(false)}>Cancel</Button>
  </Paper>}
  <Button type="button" variant="contained" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>Dental AI questions</Button>
 </Box>
}
