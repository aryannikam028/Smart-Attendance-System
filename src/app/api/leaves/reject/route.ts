import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { rejectLeave } from '@/lib/leaveStore';

const rejectSchema = z.object({
  applicationId: z.string().min(1).trim(),
  reason: z.string().min(3, 'Rejection reason is mandatory (minimum 3 characters)').max(300).trim()
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'A valid rejection reason is required.' },
        { status: 400 }
      );
    }

    const { applicationId, reason } = parsed.data;

    const result = await rejectLeave(applicationId, reason, user.name || 'admin');

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'REJECT_FAILED', message: err.message || 'Error rejecting leave' },
      { status: 500 }
    );
  }
}
