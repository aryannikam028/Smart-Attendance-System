import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript, invalidateCache, sanitizeForSheet } from '@/lib/gasClient';

const studentUpdateSchema = z.object({
  roll: z.string().min(1).max(10).trim(),
  name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits').optional().or(z.literal('')),
  prn: z.string().min(8).max(20).trim().optional(),
  reason: z.string().min(3).max(200).trim().optional()
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = studentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid student data.' },
        { status: 400 }
      );
    }

    const { roll, name, phone, prn, reason } = parsed.data;

    const payload: Record<string, any> = {
      action: 'updateStudent',
      roll,
      adminId: user.name || 'admin',
      reason: sanitizeForSheet(reason || 'Profile update by administrator')
    };

    if (name) payload.name = sanitizeForSheet(name);
    if (phone !== undefined) payload.phone = sanitizeForSheet(phone);
    if (prn) payload.prn = sanitizeForSheet(prn);

    const res = await callAppsScript('updateStudent', payload);

    if (!res.success) {
      return NextResponse.json(
        { error: 'UPDATE_FAILED', message: res.error || 'Failed to update student in Google Sheets.' },
        { status: 502 }
      );
    }

    invalidateCache('attendance');

    return NextResponse.json({
      success: true,
      message: res.data?.message || 'Student profile updated successfully in Google Sheets.'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error updating student record' },
      { status: 500 }
    );
  }
}
