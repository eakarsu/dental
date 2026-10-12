'use client'
import { Button, Stack, Typography } from '@mui/material'
import { useDentalAILauncher } from '@/lib/dental-ai-launcher'
import { dentalCatalog } from '@/lib/dental-ai-catalog'

export const dentalDemoLabels = ['Demo AI · documented', 'Demo AI · review', 'Demo AI · concise']

export default function DentalAIPresetButtons({ tool, input = {}, disabled = false }: {tool:string;input?:Record<string,unknown>;disabled?:boolean}) {
  const openAI=useDentalAILauncher(),name=dentalCatalog.find(row=>row.id===tool)?.label||'Dental AI'
  return <Stack spacing={1} sx={{my:1,minWidth:0}} aria-label={`${name} complete AI request examples`} data-dental-preset-tool={tool}>
    <Typography variant="caption">Fills all editable AI fields, including optional inputs, in AI Studio. Saved facts and missing verification are shown there.</Typography>
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
      {dentalDemoLabels.map((label,variant)=><Button key={label} type="button" size="small" variant="outlined" disabled={disabled} onClick={()=>openAI(tool,input,variant)}>{label}</Button>)}
    </Stack>
  </Stack>
}
