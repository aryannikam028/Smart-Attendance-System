import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { callAppsScript } from '@/lib/gasClient';
import { readLocalAuditLogs } from '@/lib/leaveStore';
import type { AuditLogEntry } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Administrator privileges required' }, { status: 403 });
    }

    const localLogs = readLocalAuditLogs();

    let gasLogs: AuditLogEntry[] = [];
    try {
      const res = await callAppsScript('getAuditLogs', {}, { useCache: false });
      if (res.success && Array.isArray(res.data?.data)) {
        gasLogs = res.data.data;
      }
    } catch {
      // Ignore GAS errors, fall back to local logs
    }

    // Merge logs avoiding duplicate IDs
    const map = new Map<string, AuditLogEntry>();
    for (const log of localLogs) {
      map.set(log.id, log);
    }
    for (const log of gasLogs) {
      if (log.id) {
        map.set(log.id, log);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    return NextResponse.json({
      success: true,
      logs: merged
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error retrieving audit logs' },
      { status: 500 }
    );
  }
}
