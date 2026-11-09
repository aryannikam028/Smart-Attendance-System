import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript, invalidateCache } from '@/lib/gasClient';

const changePassSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'student' || !user.prn) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = changePassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid password input.' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const res = await callAppsScript('changePassword', {
      prn: user.prn,
      currentPassword,
      newPassword
    });

    if (!res.success) {
      return NextResponse.json(
        { error: 'CHANGE_FAILED', message: res.error || 'Current password incorrect or failed to update.' },
        { status: 400 }
      );
    }

    invalidateCache('attendance');

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error updating password' },
      { status: 500 }
    );
  }
}
