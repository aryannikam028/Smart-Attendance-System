import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript, invalidateCache } from '@/lib/gasClient';

const resetPassSchema = z.object({
  roll: z.string().min(1).max(10).trim(),
  newPassword: z.string().min(6).max(50).optional()
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = resetPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Roll number is required' }, { status: 400 });
    }

    const { roll, newPassword } = parsed.data;

    const res = await callAppsScript('resetPassword', {
      roll,
      newPassword: newPassword || `pass${roll}`,
      adminId: user.name || 'admin'
    });

    if (!res.success) {
      return NextResponse.json(
        { error: 'RESET_FAILED', message: res.error || 'Failed to reset password in Google Sheets.' },
        { status: 502 }
      );
    }

    invalidateCache('attendance');

    return NextResponse.json({
      success: true,
      message: `Password for Roll ${roll} successfully reset. Student will be prompted to change on next login.`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error executing password reset' },
      { status: 500 }
    );
  }
}
