import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
export async function GET() { const session = await auth(); return session ? NextResponse.json({ user: session.user }) : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
