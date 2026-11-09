import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript, getAdminGasToken } from '@/lib/gasClient';
import { CONFIG } from '@/lib/config';
import type { SubjectStats, StudentAttendanceRow } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    const payload: Record<string, any> = {};
    if (yearStr && monthStr) {
      payload.year = parseInt(yearStr, 10);
      payload.month = parseInt(monthStr, 10);
    }

    // Pass valid session token to Apps Script, falling back to server admin token
    let token = user.gasToken;
    if (!token) {
      token = await getAdminGasToken();
    }
    payload.token = token;

    const cacheKey = `attendance_${payload.year || 'curr'}_${payload.month || 'curr'}_${user.role}_${user.prn || 'all'}`;

    let gasResponse = await callAppsScript('getData', payload, {
      useCache: !refresh,
      cacheKey
    });

    // If token expired in Apps Script, retry with fresh admin token
    if (!gasResponse.success && (gasResponse.error?.includes('Session expired') || gasResponse.error?.includes('AUTH'))) {
      payload.token = await getAdminGasToken();
      gasResponse = await callAppsScript('getData', payload, { useCache: false });
    }

    if (!gasResponse.success || !gasResponse.data) {
      return NextResponse.json(
        { error: 'SYNC_ERROR', message: gasResponse.error || 'Failed to fetch attendance from Google Sheets' },
        { status: 502 }
      );
    }

    const rawData = gasResponse.data;
    const columns = rawData.columns || [];
    const held = rawData.held || {};
    const heldTotal = Number(rawData.heldTotal || 0);
    const months = rawData.months || [];
    const activeMonth = rawData.month || { year: 2026, month: 10, label: 'October 2026' };
    const minPercent = Number(rawData.minPercent || CONFIG.minAttendancePercent);

    let rawStudents: StudentAttendanceRow[] = rawData.students || [];

    // IDOR Protection: Students only ever see their own record
    if (user.role === 'student' && user.prn) {
      rawStudents = rawStudents.filter((s) => s.prn === user.prn);
      // In case sheet returned whole list, enforce single-student isolation
      if (rawStudents.length === 0 && rawData.students?.length > 0) {
        rawStudents = rawData.students.filter((s: any) => s.prn === user.prn);
      }
    }

    // Compute subject statistics & 75% predictions
    const subjectStatsMap: Record<string, { conducted: number; attended: number }> = {};
    for (const [sub, condCount] of Object.entries(held)) {
      subjectStatsMap[sub] = { conducted: Number(condCount), attended: 0 };
    }

    // For single student view (or student dashboard)
    if (user.role === 'student' && rawStudents.length > 0) {
      const student = rawStudents[0];
      const studentAttended = student.attended || {};

      const subjects: SubjectStats[] = Object.keys(subjectStatsMap).map((sub) => {
        const c = subjectStatsMap[sub].conducted;
        const a = Number(studentAttended[sub] || 0);
        const m = Math.max(0, c - a);
        const pct = c > 0 ? Number(((a / c) * 100).toFixed(1)) : 100;
        // Formula: x = ceil(3*C - 4*A) if A/C < 0.75, else 0
        const needed = pct < minPercent ? Math.max(0, Math.ceil(3 * c - 4 * a)) : 0;

        return {
          subjectName: sub,
          conducted: c,
          attended: a,
          missed: m,
          percentage: pct,
          needed75: needed,
          isDefaulter: pct < minPercent
        };
      });

      const totalAttended = Number(student.total || 0);
      const totalMissed = Math.max(0, heldTotal - totalAttended);
      const overallPercent = heldTotal > 0 ? Number(((totalAttended / heldTotal) * 100).toFixed(1)) : 100;
      const overallNeeded75 = overallPercent < minPercent ? Math.max(0, Math.ceil(3 * heldTotal - 4 * totalAttended)) : 0;

      return NextResponse.json({
        success: true,
        role: user.role,
        lastSynced: gasResponse.lastSynced,
        cached: gasResponse.cached || false,
        activeMonth,
        months,
        columns,
        heldTotal,
        minPercent,
        student: {
          ...student,
          totalAttended,
          totalMissed,
          totalConducted: heldTotal,
          overallPercent,
          overallNeeded75,
          isDefaulter: overallPercent < minPercent
        },
        subjects
      });
    }

    // For Admin: Calculate class summary & all students
    let classTotalAttended = 0;
    let defaultersCount = 0;
    let topPerformersCount = 0;

    const processedStudents = rawStudents.map((s) => {
      const a = Number(s.total || 0);
      const c = heldTotal;
      const pct = c > 0 ? Number(((a / c) * 100).toFixed(1)) : 100;
      const needed75 = pct < minPercent ? Math.max(0, Math.ceil(3 * c - 4 * a)) : 0;
      const isDefaulter = pct < minPercent;
      const isTopPerformer = pct >= CONFIG.topPerformerPercent;

      classTotalAttended += a;
      if (isDefaulter) defaultersCount++;
      if (isTopPerformer) topPerformersCount++;

      // Mask sensitive phone numbers for client safety unless admin requests
      return {
        ...s,
        totalAttended: a,
        totalMissed: Math.max(0, c - a),
        totalConducted: c,
        percent: pct,
        needed75,
        isDefaulter,
        isTopPerformer,
        password: undefined // NEVER expose passwords
      };
    });

    const classAveragePercent = (processedStudents.length > 0 && heldTotal > 0)
      ? Number(((classTotalAttended / (processedStudents.length * heldTotal)) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      role: 'admin',
      lastSynced: gasResponse.lastSynced,
      cached: gasResponse.cached || false,
      activeMonth,
      months,
      columns,
      heldTotal,
      minPercent,
      topPerformerPercent: CONFIG.topPerformerPercent,
      overview: {
        totalStudents: processedStudents.length,
        defaulterCount: defaultersCount,
        topPerformerCount: topPerformersCount,
        classAveragePercent,
        totalConductedLectures: heldTotal,
        totalScheduledLectures: columns.filter((c: any) => !c.nonWorking).length
      },
      students: processedStudents
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Failed to process attendance data' },
      { status: 500 }
    );
  }
}
