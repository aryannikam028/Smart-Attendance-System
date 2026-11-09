import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript, invalidateCache, sanitizeForSheet, getAdminGasToken } from '@/lib/gasClient';

const updateSchema = z.object({
  col: z.number().int().min(7),
  roll: z.string().min(1).max(10).trim(),
  status: z.enum(['P', 'A']),
  reason: z.string().min(3).max(300).trim(),
  year: z.number().int().optional(),
  month: z.number().int().optional()
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);

    // Strict role check: Deny by default. Students NEVER have write permissions
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Valid column, roll number, status (P/A), and justification reason are required.' },
        { status: 400 }
      );
    }

    const { col, roll, status, reason, year, month } = parsed.data;

    const adminToken = user.gasToken || (await getAdminGasToken());

    const payload = {
      action: 'setAttendance',
      token: adminToken,
      col,
      roll,
      status,
      reason: sanitizeForSheet(reason),
      adminId: user.name || 'admin',
      year,
      month
    };

    const res = await callAppsScript('setAttendance', payload);

    if (!res.success) {
      return NextResponse.json(
        { error: 'SHEET_UPDATE_FAILED', message: res.error || 'Failed to update Google Sheets cell.' },
        { status: 502 }
      );
    }

    // Invalidate attendance cache immediately so changes reflect on next fetch
    invalidateCache('attendance');

    return NextResponse.json({
      success: true,
      message: `Successfully marked roll ${roll} as ${status} in lecture column ${col}.`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error executing attendance update' },
      { status: 500 }
    );
  }
}
