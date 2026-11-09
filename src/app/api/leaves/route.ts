import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { applyForLeave, getLeaveApplications } from '@/lib/leaveStore';
import { findStudentByPrn } from '@/lib/studentRoster';

const leaveApplySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  reason: z.string().min(5, 'Reason must be at least 5 characters.').max(300).trim()
});

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const applications = await getLeaveApplications(user.role === 'student' ? user.prn : undefined);

    return NextResponse.json({
      success: true,
      applications
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error fetching leaves' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'student' || !user.prn) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Only authenticated students may submit leave applications.' },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`leave_${user.prn}_${ip}`, {
      windowMs: 60 * 1000,
      maxAttempts: 5
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: 'Please wait before submitting another leave application.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = leaveApplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid leave application details.' },
        { status: 400 }
      );
    }

    const { date, reason } = parsed.data;

    // Check past date abuse window: max 7 days in past
    const selectedDate = new Date(date);
    const now = new Date();
    const minPastDate = new Date();
    minPastDate.setDate(now.getDate() - 7);

    if (selectedDate < minPastDate) {
      return NextResponse.json(
        { error: 'PAST_DATE_LIMIT', message: 'Leave applications cannot be submitted for dates more than 7 days in the past.' },
        { status: 400 }
      );
    }

    let studentRoll = Number(user.roll || 0);
    let studentName = user.name || 'Student';

    if (!studentRoll || studentName === 'Student') {
      const rosterItem = findStudentByPrn(user.prn);
      if (rosterItem) {
        studentRoll = Number(rosterItem.roll);
        studentName = rosterItem.name;
      }
    }

    const application = await applyForLeave({
      prn: user.prn,
      studentName,
      rollNo: studentRoll,
      date,
      reason
    });

    return NextResponse.json({
      success: true,
      message: 'Leave application submitted successfully for review.',
      applicationId: application.id
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SUBMIT_FAILED', message: err.message || 'Error processing leave submission' },
      { status: 400 }
    );
  }
}
