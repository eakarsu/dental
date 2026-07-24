import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await auth(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({})); const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  const apiKey=process.env.OPENROUTER_API_KEY,model=process.env.OPENROUTER_MODEL,baseUrl=process.env.OPENROUTER_BASE_URL;
  if(!apiKey||!model||!baseUrl)return NextResponse.json({error:'OpenRouter runtime is not configured'},{status:503});
  const response=await fetch(`${baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,messages:[{role:'system',content:'You are a dental-clinic operations reviewer, not a diagnostic system. Return operational risks, evidence gaps, next actions, uncertainty, and required licensed-clinician review.'},{role:'user',content:prompt}]})});
  if(!response.ok)return NextResponse.json({error:`OpenRouter returned ${response.status}`},{status:502});const payload=await response.json();const output=String(payload?.choices?.[0]?.message?.content||'').trim();if(!output)return NextResponse.json({error:'OpenRouter returned an empty response'},{status:502});
  const saved=await prisma.aiRuntimeResult.create({data:{clinicId:session.user.clinicId,userId:session.user.id,feature:'runtime-readiness',input:{prompt},output,model}});
  return NextResponse.json({id:saved.id,response:output,model,provider:'openrouter'});
}
