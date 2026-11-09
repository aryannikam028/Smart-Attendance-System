// Server-only configuration module.
// NEVER import this file in client components.

export const CONFIG = {
  // Google Apps Script endpoint & shared secret
  appsScriptUrl: process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxxtCSDo9Mj9ci1oNbtsj37_LYz-olr2HUpXQiu7x4g1J5nmmWYm47rQxIhuzukfGUHBQ/exec',
  appsScriptSecret: process.env.APPS_SCRIPT_SHARED_SECRET || 'SMART_ATTENDANCE_SECRET_KEY_2026',

  // Cryptographic session signing
  jwtSecret: process.env.JWT_SECRET || 'c21hcnQtYXR0ZW5kYW5jZS1zZWNyZXQta2V5LTIwMjYtMjAyNy15c3Bt',

  // Admin Root Credentials
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',

  // Institutional Parameters
  minAttendancePercent: Number(process.env.ATTENDANCE_MIN_PERCENT || 75),
  topPerformerPercent: Number(process.env.TOP_PERFORMER_PERCENT || 90),

  // Institution Metadata
  collegeName: process.env.COLLEGE_NAME || 'Yashoda Technical Campus, Satara (YSPM)',
  departmentName: process.env.DEPARTMENT_NAME || 'Electronics & Telecommunication Engineering',
  classDivision: process.env.CLASS_DIVISION || 'Final Year B.Tech (Division B)',
  academicYear: process.env.ACADEMIC_YEAR || '2026-2027',
  semester: process.env.SEMESTER || 'Sem VII',

  // Cache TTL in seconds (between 30 and 60 seconds per requirement)
  cacheTtlSeconds: 45
};

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(CONFIG.jwtSecret);
}
