'use client'
import { useRouter } from 'next/navigation'
const drafts=new Map<string,{input:Record<string,unknown>;preset?:number;expires:number}>()
export function takeDentalDraft(id:string){const item=drafts.get(id);drafts.delete(id);return item&&item.expires>Date.now()?{input:item.input,preset:item.preset}:null}
export function useDentalAILauncher(){
  const router=useRouter()
  return (tool:string,input:Record<string,unknown>={},preset?:number)=>{
    for(const[id,item]of drafts)if(item.expires<Date.now())drafts.delete(id)
    const id=crypto.randomUUID();drafts.set(id,{input,preset:typeof preset==='number'&&Number.isInteger(preset)&&preset>=0&&preset<=2?preset:undefined,expires:Date.now()+300_000})
    router.push(`/dashboard/ai-studio?tool=${encodeURIComponent(tool)}&draft=${id}`)
  }
}
