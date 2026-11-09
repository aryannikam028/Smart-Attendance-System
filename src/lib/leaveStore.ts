import fs from 'fs';
import path from 'path';
import type { LeaveApplication, AuditLogEntry } from '@/lib/types';
import { callAppsScript, invalidateCache, sanitizeForSheet } from '@/lib/gasClient';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEAVES_FILE = path.join(DATA_DIR, 'leaves.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEAVES_FILE)) {
    fs.writeFileSync(LEAVES_FILE, JSON.stringify([]), 'utf8');
  }
  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([]), 'utf8');
  }
}

function readLocalLeaves(): LeaveApplication[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(LEAVES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalLeaves(leaves: LeaveApplication[]) {
  ensureDataDir();
  fs.writeFileSync(LEAVES_FILE, JSON.stringify(leaves, null, 2), 'utf8');
}

export function readLocalAuditLogs(): AuditLogEntry[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeLocalAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  ensureDataDir();
  const logs = readLocalAuditLogs();
  const newLog: AuditLogEntry = {
    id: `AUD-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  logs.unshift(newLog);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs.slice(0, 500), null, 2), 'utf8');
}

/**
 * Get all leave applications (combines local store with Google Sheets if available)
 */
export async function getLeaveApplications(prn?: string): Promise<LeaveApplication[]> {
  const localList = readLocalLeaves();

  // Attempt to fetch from Google Sheets as well
  let gasList: LeaveApplication[] = [];
  try {
    const res = await callAppsScript('getLeaves', prn ? { prn } : {});
    if (res.success && Array.isArray(res.data?.data || res.data?.applications)) {
      gasList = (res.data?.data || res.data?.applications) as LeaveApplication[];
    }
  } catch {
    // Ignore GAS errors, fall back to local store
  }

  // Merge lists by ID
  const map = new Map<string, LeaveApplication>();
  for (const item of localList) {
    map.set(item.id, item);
  }
  for (const item of gasList) {
    if (item.id) {
      map.set(item.id, { ...map.get(item.id), ...item });
    }
  }

  let merged = Array.from(map.values());
  if (prn) {
    merged = merged.filter((app) => app.prn === prn);
  }

  return merged.sort((a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime());
}

/**
 * Submit a new leave application
 */
export async function applyForLeave(input: {
  prn: string;
  studentName: string;
  rollNo: number;
  date: string;
  reason: string;
}): Promise<LeaveApplication> {
  const existing = await getLeaveApplications(input.prn);
  const activeDuplicate = existing.find(
    (app) => (app.date === input.date || app.startDate === input.date) && app.status !== 'Rejected'
  );

  if (activeDuplicate) {
    throw new Error(`You already have an active leave application for ${input.date}.`);
  }

  const id = `LV-${input.date.replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const application: LeaveApplication = {
    id,
    prn: input.prn,
    rollNo: input.rollNo,
    studentName: input.studentName,
    date: input.date,
    startDate: input.date,
    endDate: input.date,
    reason: input.reason,
    status: 'Pending',
    appliedDate: now
  };

  // 1. Save locally first (guaranteed persistence)
  const current = readLocalLeaves();
  current.unshift(application);
  writeLocalLeaves(current);

  // 2. Sync to Google Apps Script (if v9.2 backend is available)
  try {
    await callAppsScript('applyLeave', {
      applicationId: id,
      prn: input.prn,
      studentName: input.studentName,
      rollNo: input.rollNo,
      date: input.date,
      startDate: input.date,
      endDate: input.date,
      reason: sanitizeForSheet(input.reason)
    });
  } catch {
    // If Apps Script does not have applyLeave deployed yet, local record is safe
  }

  invalidateCache('leaves');
  return application;
}

/**
 * Approve a leave application and update Google Sheets attendance to 'P'
 */
export async function approveLeave(
  applicationId: string,
  remarks: string,
  adminId: string
): Promise<{ success: boolean; message: string; markedCount?: number }> {
  const current = readLocalLeaves();
  const appIndex = current.findIndex((a) => a.id === applicationId);

  if (appIndex === -1) {
    throw new Error(`Leave application ${applicationId} not found.`);
  }

  const app = current[appIndex];
  app.status = 'Approved';
  app.adminRemarks = remarks;
  writeLocalLeaves(current);

  // Record in audit log
  writeLocalAuditLog({
    adminId,
    action: 'APPROVE_LEAVE',
    targetPrn: app.prn,
    targetStudentName: app.studentName,
    date: app.date || app.startDate || '',
    previousStatus: 'Pending',
    newStatus: 'Approved',
    reason: remarks || 'Approved by Admin'
  });

  // Automatically mark Present 'P' in Google Sheets for that student on that date
  let markedCount = 0;
  try {
    const leaveDate = new Date(app.date || app.startDate || '');
    if (!isNaN(leaveDate.getTime())) {
      const year = leaveDate.getFullYear();
      const month = leaveDate.getMonth() + 1;
      const day = leaveDate.getDate();

      const attendanceRes = await callAppsScript('getData', { year, month });
      if (attendanceRes.success && attendanceRes.data?.columns) {
        const matchingCols = (attendanceRes.data.columns as any[]).filter((c) => c.date === day);
        for (const col of matchingCols) {
          try {
            await callAppsScript('setAttendance', {
              col: col.col,
              roll: String(app.rollNo),
              status: 'P',
              reason: sanitizeForSheet(`Approved Leave (${app.reason})`),
              year,
              month
            });
            markedCount++;
          } catch {
            // Continue marking subsequent columns
          }
        }
      }
    }
  } catch {
    // If auto-marking fails, leave record still updated
  }

  // Also notify Google Apps Script approveLeave if supported
  try {
    await callAppsScript('approveLeave', {
      applicationId,
      remarks: sanitizeForSheet(remarks),
      adminId
    });
  } catch {
    // Ignore if not implemented on GAS yet
  }

  invalidateCache('leaves');
  invalidateCache('attendance');

  return {
    success: true,
    message: `Leave approved successfully.${markedCount > 0 ? ` Marked Present across ${markedCount} lecture(s).` : ''}`,
    markedCount
  };
}

/**
 * Reject a leave application
 */
export async function rejectLeave(
  applicationId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const current = readLocalLeaves();
  const appIndex = current.findIndex((a) => a.id === applicationId);

  if (appIndex === -1) {
    throw new Error(`Leave application ${applicationId} not found.`);
  }

  const app = current[appIndex];
  app.status = 'Rejected';
  app.rejectionReason = reason;
  writeLocalLeaves(current);

  // Record in audit log
  writeLocalAuditLog({
    adminId,
    action: 'REJECT_LEAVE',
    targetPrn: app.prn,
    targetStudentName: app.studentName,
    date: app.date || app.startDate || '',
    previousStatus: 'Pending',
    newStatus: 'Rejected',
    reason
  });

  // Also notify Google Apps Script rejectLeave if supported
  try {
    await callAppsScript('rejectLeave', {
      applicationId,
      reason: sanitizeForSheet(reason),
      adminId
    });
  } catch {
    // Ignore if not implemented on GAS yet
  }

  invalidateCache('leaves');
  invalidateCache('attendance');

  return {
    success: true,
    message: 'Leave application rejected.'
  };
}
