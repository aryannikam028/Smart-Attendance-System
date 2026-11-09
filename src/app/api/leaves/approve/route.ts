import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { approveLeave } from '@/lib/leaveStore';

const approveSchema = z.object({
  applicationId: z.string().min(1).trim(),
  remarks: z.string().max(300).optional()
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Application ID is required' }, { status: 400 });
    }

    const { applicationId, remarks } = parsed.data;

    const result = await approveLeave(applicationId, remarks || 'Approved by Admin', user.name || 'admin');

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'APPROVAL_FAILED', message: err.message || 'Error approving leave' },
      { status: 500 }
    );
  }
}
