import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canReadClinicalData } from '@/lib/clinical-policy'
import { dentalActor, dentalFailure, dentalHistory } from '@/lib/dental-ai-runtime'
export async function GET(request: NextRequest) {
  try {
    request.signal.throwIfAborted()
    const actor=await dentalActor(),clinical=canReadClinicalData(actor.role)
    const [patients,appointments,treatments,claims,dentists,items]=await Promise.all([
      prisma.patient.findMany({where:{clinicId:actor.clinicId,isActive:true},orderBy:{lastName:'asc'},take:200,select:{id:true,firstName:true,lastName:true,dateOfBirth:true,insuranceProvider:true,...(clinical&&{medicalHistory:true,notes:true,identityMatchKey:true})}}),
      prisma.appointment.findMany({where:{patient:{clinicId:actor.clinicId}},orderBy:{startTime:'desc'},take:200,select:{id:true,patientId:true,dentistId:true,type:true,startTime:true,endTime:true}}),
      prisma.treatment.findMany({where:{patient:{clinicId:actor.clinicId}},orderBy:{createdAt:'desc'},take:200,select:{id:true,patientId:true,treatmentCode:true,treatmentName:true,status:true,estimatedCost:true,toothNumber:true,startDate:true,completionDate:true,...(clinical&&{description:true,notes:true})}}),
      prisma.insuranceClaim.findMany({where:{patient:{clinicId:actor.clinicId}},orderBy:{createdAt:'desc'},take:200,select:{id:true,patientId:true,treatmentId:true,claimNumber:true,insuranceProvider:true,claimedAmount:true,denialReason:true,...(clinical&&{notes:true})}}),
      prisma.user.findMany({where:{clinicId:actor.clinicId,isActive:true,role:'DENTIST'},select:{id:true,firstName:true,lastName:true}}),
      dentalHistory(actor),
    ])
    request.signal.throwIfAborted()
    const current=await dentalActor()
    if(current.role!==actor.role)throw Object.assign(Error('Your clinic role changed'),{status:401})
    return NextResponse.json({clinical,patients,appointments,treatments,claims,dentists,items},{headers:{'Cache-Control':'no-store'}})
  }catch(error){return dentalFailure(error,request.signal)}
}
