import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'
import { prisma } from './prisma'
import { canReadClinicalData } from './clinical-policy'
import { decryptRegulated, digestRegulated, encryptRegulated } from './regulated-data'
import { dentalAIContext, dentalAIError, type DentalAIContext } from './dental-ai-context'

export const clinicalAITools = new Set(['generate-notes','generate-soap-notes','suggest-cdt-code','translate-jargon','risk-assessment','treatment-recommendations','treatment-plan-summary'])
export const dentalAITools = [...clinicalAITools, 'analyze-claim','generate-appeal-letter','generate-communication','payment-plan-recommendation','predict-no-show','smart-scheduling','revenue-forecast','dashboard-insights','chatbot']
type DB = Pick<typeof prisma, 'user'|'patient'|'patientConsent'|'appointment'|'treatment'|'insuranceClaim'>
export async function dentalActor(db: Pick<typeof prisma,'user'> = prisma) {
  const session = await auth()
  if (!session?.user?.id || !session.user.clinicId) throw dentalAIError('Sign in to your clinic', 401)
  const actor = await db.user.findFirst({ where: { id: session.user.id, clinicId: session.user.clinicId, isActive: true }, select: { id: true, clinicId: true, role: true } })
  if (!actor) throw dentalAIError('Your clinic account is no longer active', 401)
  return actor
}
function checkBody(value: unknown, depth=0) {
  if (depth>7) throw dentalAIError('Request fields are too deeply nested',400)
  if (typeof value==='string' && value.length>12000) throw dentalAIError('A request field exceeds 12000 characters',400)
  if (typeof value==='number' && !Number.isFinite(value)) throw dentalAIError('A numeric request field is invalid',400)
  if (Array.isArray(value)) { if(value.length>100)throw dentalAIError('A request has too many rows',400);value.forEach(v=>checkBody(v,depth+1)) }
  else if (value && typeof value==='object')Object.values(value).forEach(v=>checkBody(v,depth+1))
}
export async function dentalSource(tool: string, body: Record<string,any>, actor: Awaited<ReturnType<typeof dentalActor>>, db: DB = prisma) {
  const clinical = clinicalAITools.has(tool)
  if (clinical && !canReadClinicalData(actor.role)) throw dentalAIError('A clinical role is required for this tool',403)
  if(body.sourcePatientId&&body.patientId&&body.sourcePatientId!==body.patientId)throw dentalAIError('Native patient reference differs from the selected source',400)
  if(body.sourceAppointmentId&&body.appointmentId&&body.sourceAppointmentId!==body.appointmentId)throw dentalAIError('Native appointment reference differs from the selected source',400)
  const patientId = body.sourcePatientId || body.patientId
  const needsPatient = clinical || ['analyze-claim','generate-appeal-letter','generate-communication','payment-plan-recommendation','smart-scheduling'].includes(tool)
  if(needsPatient && (typeof patientId!=='string'||!patientId))throw dentalAIError('Select an actual patient in your clinic',400)
  let patient = patientId ? await db.patient.findFirst({ where: { id: patientId, clinicId: actor.clinicId, isActive: true } }) : null
  if(patientId && !patient)throw dentalAIError('Patient not found in your clinic',404)
  const appointmentId = body.appointmentId || body.sourceAppointmentId
  const appointment = appointmentId ? await db.appointment.findFirst({ where: { id: appointmentId, patient: { clinicId: actor.clinicId }, ...(patient && {patientId:patient.id}) } }) : null
  if(!patient && appointment)patient=await db.patient.findFirst({where:{id:appointment.patientId,clinicId:actor.clinicId,isActive:true}})
  if(appointmentId && !appointment)throw dentalAIError('Appointment not found for this patient and clinic',404)
  if(tool==='predict-no-show'&&!appointment&&!patient)throw dentalAIError('Select an actual appointment or patient',400)
  if(body.dentistId && !await db.user.findFirst({ where: { id: body.dentistId, clinicId: actor.clinicId, isActive: true, role:'DENTIST' } }))throw dentalAIError('Dentist not found in your clinic',404)
  const treatment = body.sourceTreatmentId ? await db.treatment.findFirst({ where: { id: body.sourceTreatmentId, patient: {clinicId:actor.clinicId}, ...(patient&&{patientId:patient.id}) } }) : null
  if(body.sourceTreatmentId&&!treatment)throw dentalAIError('Treatment not found for this patient and clinic',404)
  const claim = body.sourceClaimId ? await db.insuranceClaim.findFirst({ where: { id: body.sourceClaimId, patient: {clinicId:actor.clinicId}, ...(patient&&{patientId:patient.id}) }, include:{treatment:true} }) : null
  if(claim?.treatment&&claim.treatment.patientId!==claim.patientId)throw dentalAIError('The claim treatment does not belong to its patient; correct the native record',409)
  if(body.sourceClaimId&&!claim)throw dentalAIError('Claim not found for this patient and clinic',404)
  if(['analyze-claim','generate-appeal-letter'].includes(tool)&&!claim)throw dentalAIError('Select an actual claim',400)
  if(tool==='payment-plan-recommendation'&&!treatment)throw dentalAIError('Select an actual treatment',400)
  const consent = clinical && patient ? await db.patientConsent.findFirst({ where: { clinicId: actor.clinicId, patientId: patient.id, scope:'clinical-care', status:'ACTIVE', revokedAt:null, effectiveAt:{lte:new Date()}, OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}] }, orderBy:{createdAt:'desc'} }) : null
  if(clinical && (!patient?.identityMatchKey||!consent))throw dentalAIError('Verified patient identity and active clinical-care consent are required; use Clinical Review intake',422)
  const planTreatments=tool==='treatment-plan-summary'&&patient?await db.treatment.findMany({where:{patientId:patient.id,patient:{clinicId:actor.clinicId}},orderBy:{id:'asc'}}):[]
  const appointmentHistory=tool==='predict-no-show'&&patient?await db.appointment.findMany({where:{patientId:patient.id,patient:{clinicId:actor.clinicId}},orderBy:{startTime:'desc'},take:20}):[]
  return { patient, appointment, treatment, claim, consent, planTreatments, appointmentHistory }
}
export function dentalFailure(error: unknown, signal?: AbortSignal) {
  const reason=signal?.aborted?signal.reason:error
  const status=typeof reason==='object'&&reason&&'status'in reason?Number(reason.status):500
  return NextResponse.json({error: reason instanceof Error && status>=400&&status<600?reason.message:'AI request failed; no report was saved'}, {status:status>=400&&status<600?status:500,headers:{'Cache-Control':'no-store'}})
}
export function withDentalAI(tool: string, native: (request: NextRequest)=>Promise<Response>) {
  return async (request: NextRequest) => {
    const controller=new AbortController(),abort=()=>controller.abort(dentalAIError('AI request cancelled',499))
    request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort()
    const timer=setTimeout(()=>controller.abort(dentalAIError('AI request timed out',504)),60_000);timer.unref?.()
    const context: DentalAIContext={signal:controller.signal,receipts:[]}
    try {
      controller.signal.throwIfAborted()
      const actor=await dentalActor()
      const raw=request.method==='GET'?{reviewFocus:new URL(request.url).searchParams.get('reviewFocus')||''}:await request.clone().text()
      if(typeof raw==='string'&&raw.length>64_000)throw dentalAIError('Request is too large',413)
      const input=typeof raw==='string'?(()=>{try{return JSON.parse(raw)}catch{throw dentalAIError('A valid JSON request body is required',400)}})():raw
      if(!input||typeof input!=='object'||Array.isArray(input))throw dentalAIError('A JSON request object is required',400)
      checkBody(input)
      const source=await dentalSource(tool,input,actor),sourceHash=digestRegulated(source)
      if(source.patient){
        const patient=source.patient, birth=patient.dateOfBirth,now=new Date()
        if('patientAge'in input)input.patientAge=now.getFullYear()-birth.getFullYear()-(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate())?1:0)
        if('patientName'in input)input.patientName=`${patient.firstName} ${patient.lastName}`
        const history=patient.medicalHistory as Record<string,unknown>|null
        if(clinicalAITools.has(tool)){
          for(const [key,sourceKey]of [['medicalHistory','conditions'],['medications','medications'],['allergies','allergies']] as const)if(key in input){const actual=Array.isArray(history?.[sourceKey])?history![sourceKey]:[];if(digestRegulated(input[key])!==digestRegulated(actual))throw dentalAIError('Saved clinical history differs from the request; reload source facts and review again',409);input[key]=actual}
          context.evidenceNote=['allergies','conditions','medications','vitalSigns','smokingStatus','diabetic'].filter(key=>history?.[key]===undefined||history?.[key]===null).map(key=>`${key} is not documented in the saved source; absence is not a negative finding, and any manual observation requires clinician verification`).join('; ')
        }
      }
      if(source.claim){input.claimNumber=source.claim.claimNumber;input.claimedAmount=Number(source.claim.claimedAmount);input.insuranceProvider=source.claim.insuranceProvider;input.denialReason=source.claim.denialReason||'Not documented';if(source.claim.treatment){input.treatmentCode=source.claim.treatment.treatmentCode;input.treatmentName=source.claim.treatment.treatmentName}}
      if(tool==='payment-plan-recommendation'&&source.treatment)input.totalAmount=Number(source.treatment.estimatedCost)
      if(tool==='treatment-plan-summary'&&source.patient){const rows=source.planTreatments;if(!rows.length)throw dentalAIError('This patient has no recorded treatments to summarize',400);input.treatments=rows.map(row=>({treatmentCode:row.treatmentCode,treatmentName:row.treatmentName,toothNumber:row.toothNumber,estimatedCost:Number(row.estimatedCost),description:row.description||'Not documented'}));input.totalCost=rows.reduce((sum,row)=>sum+Number(row.estimatedCost),0)}
      context.evidenceNote=(context.evidenceNote||'')+' '+(source.treatment?`Selected treatment status is ${source.treatment.status}. Generic descriptions and notes do not establish a confirmed diagnosis, observed objective finding or performed procedure.`:'No signed procedure record is supplied; a proposed treatment type does not establish observed findings or a performed procedure.')
      context.reviewFocus=typeof input.reviewFocus==='string'?input.reviewFocus:''
      // Require encryption before sending patient data to the provider.
      try{encryptRegulated({check:true})}catch{throw dentalAIError('Regulated-data encryption is not configured',503)}
      controller.signal.throwIfAborted()
      let nativeRequest=request
      if(request.method!=='GET')nativeRequest=new NextRequest(request.url,{method:request.method,headers:request.headers,body:JSON.stringify(input),signal:controller.signal})
      else nativeRequest=new NextRequest(request.url,{headers:request.headers,signal:controller.signal})
      const response=await dentalAIContext.run(context,()=>native(nativeRequest))
      controller.signal.throwIfAborted()
      if(context.failure)throw context.failure
      if(!response.ok)return NextResponse.json({error:response.status===400?'Review the required native request fields':'The provider did not return a complete report'}, {status:response.status===400?400:502})
      if(!context.receipts.length)throw dentalAIError('No genuine provider response was produced',502)
      const output=await response.json()
      if(!output||typeof output!=='object')throw dentalAIError('Provider response is invalid',502)
      const row=await prisma.$transaction(async tx=>{
        controller.signal.throwIfAborted()
        // Hold source rows only while the receipt transaction commits, never during provider I/O.
        // Parent UPDATE locks also protect new treatment/consent/history rows through native FKs.
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} AND "clinicId"=${actor.clinicId} FOR SHARE`
        if(source.patient){
          await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${source.patient.id} AND "clinicId"=${actor.clinicId} FOR UPDATE`
          if(clinicalAITools.has(tool))await tx.$queryRaw`SELECT id FROM "PatientConsent" WHERE "patientId"=${source.patient.id} AND "clinicId"=${actor.clinicId} FOR SHARE`
          if(tool==='treatment-plan-summary')await tx.$queryRaw`SELECT id FROM "Treatment" WHERE "patientId"=${source.patient.id} FOR SHARE`
          if(tool==='predict-no-show')await tx.$queryRaw`SELECT id FROM "Appointment" WHERE "patientId"=${source.patient.id} FOR SHARE`
        }
        if(source.treatment)await tx.$queryRaw`SELECT id FROM "Treatment" WHERE id=${source.treatment.id} FOR SHARE`
        if(source.claim){await tx.$queryRaw`SELECT id FROM "InsuranceClaim" WHERE id=${source.claim.id} FOR SHARE`;if(source.claim.treatmentId)await tx.$queryRaw`SELECT id FROM "Treatment" WHERE id=${source.claim.treatmentId} FOR SHARE`}
        if(source.appointment)await tx.$queryRaw`SELECT id FROM "Appointment" WHERE id=${source.appointment.id} FOR SHARE`
        controller.signal.throwIfAborted()
        const current=await dentalActor(tx)
        if(current.id!==actor.id||current.clinicId!==actor.clinicId||current.role!==actor.role)throw dentalAIError('Your clinic account changed during generation',401)
        if(digestRegulated(await dentalSource(tool,input,current,tx))!==sourceHash)throw dentalAIError('The selected records changed; review and generate again',409)
        const row=await tx.aiRuntimeResult.create({data:{userId:actor.id,clinicId:actor.clinicId,feature:`dental:${tool}`,input:{ciphertext:encryptRegulated(input),providerReceipts:context.receipts,sourceDigest:sourceHash},output:encryptRegulated(output),model:context.receipts.map(r=>r.model).join(', ')}})
        controller.signal.throwIfAborted()
        const finalActor=await dentalActor(tx)
        if(finalActor.role!==actor.role)throw dentalAIError('Your role changed during generation',401)
        if(digestRegulated(await dentalSource(tool,input,finalActor,tx))!==sourceHash)throw dentalAIError('The selected records changed; review and generate again',409)
        controller.signal.throwIfAborted()
        return row
      })
      controller.signal.throwIfAborted()
      return NextResponse.json({...output,_ai:{id:row.id,tool,model:row.model,createdAt:row.createdAt.toISOString(),providerReceipts:context.receipts,reviewStatus:'DRAFT_REQUIRES_HUMAN_REVIEW'}},{headers:{'Cache-Control':'no-store'}})
    }catch(error){return dentalFailure(error,controller.signal)}finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort)}
  }
}
export async function dentalHistory(actor: Awaited<ReturnType<typeof dentalActor>>) {
  const features=dentalAITools.filter(tool=>!clinicalAITools.has(tool)||canReadClinicalData(actor.role)).map(tool=>`dental:${tool}`)
  const rows=await prisma.aiRuntimeResult.findMany({where:{clinicId:actor.clinicId,userId:actor.id,feature:{in:features}},orderBy:{createdAt:'desc'},take:50})
  return rows.map(row=>({id:row.id,tool:row.feature.slice(7),model:row.model,createdAt:row.createdAt.toISOString(),input:decryptRegulated((row.input as {ciphertext:string}).ciphertext),output:decryptRegulated(row.output),reviewStatus:'DRAFT_REQUIRES_HUMAN_REVIEW',canDelete:false}))
}
