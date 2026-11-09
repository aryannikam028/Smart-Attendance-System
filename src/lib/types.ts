export type UserRole = 'student' | 'admin';

export interface SessionUser {
  role: UserRole;
  prn?: string;
  name?: string;
  roll?: string;
  adminId?: string;
  gasToken?: string;
}

export interface StudentProfile {
  rollNo: number;
  name: string;
  prn: string;
  parentPhone: string;
  branch: string;
  academicYear: string;
  semester: string;
  classDivision: string;
  lastScanTime?: string;
  status: string;
}

export interface LectureColumn {
  i: number;
  col: number;
  date: number;
  dow: number;
  dayName: string;
  label: string;
  time: string;
  nonWorking: boolean;
  nonLabel: string;
  practical: boolean;
  held: number; // 1 if held (at least 1 present), 0 if skipped/not held
}

export interface StudentAttendanceRow {
  roll: string;
  name: string;
  prn: string;
  time: string;
  cells: string[]; // "P", "A", or ""
  attended: Record<string, number>;
  total: number;
  percent: number;
  phone?: string;
}

export interface SubjectStats {
  subjectName: string;
  conducted: number;
  attended: number;
  missed: number;
  percentage: number;
  needed75: number;
  isDefaulter: boolean;
}

export interface MonthOption {
  year: number;
  month: number;
  label: string;
  tab?: string;
}

export interface LeaveApplication {
  id: string;
  prn: string;
  rollNo: number;
  studentName: string;
  date: string;
  startDate?: string;
  endDate?: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  appliedDate: string;
  adminRemarks?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  targetPrn: string;
  targetStudentName: string;
  date: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

export interface ClassOverview {
  totalStudents: number;
  defaulterCount: number;
  topPerformerCount: number;
  classAttendancePercentage: number;
  totalConductedLectures: number;
  pendingLeavesCount: number;
}
