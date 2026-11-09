# Smart Attendance System (v2.0)
### Yashoda Technical Campus, Satara (YSPM) — Faculty of Engineering
**Department of Electronics & Telecommunication Engineering**  
*Final Year B.Tech (Division B) — Semester VII (Academic Year 2026–27)*

---

## Overview

The **Smart Attendance System** is an enterprise-grade, secure, and resilient web application that connects an existing **ESP8266 optical fingerprint biometric attendance scanner** and **Google Sheets** register with a modern, high-performance web portal.

Built with **Next.js 16 App Router**, **TypeScript**, and a custom **Neumorphic Soft UI design system**, it delivers dual portals for students and faculty while ensuring zero leakage of student records, robust rate limiting, formula injection defenses, and atomic state synchronization.

---

## Key Highlights

- ⚡ **Zero Hardware Breakage**: The deployed ESP8266 Arduino sketch (`SmartAttendance_v10 website.ino`) and its raw CSV POST transmission (`values=101,25,...`) remain **100% intact and untouched**.
- 🔒 **Zero-Trust Backend-For-Frontend (BFF)**: Google Apps Script Web App URLs and secret keys are completely hidden from the client browser. All communication flows through authenticated, rate-limited Next.js server endpoints.
- 🛡️ **Cryptographic IDOR Defense**: Students authenticated by PRN are strictly scoped to their own attendance records. Class matrices, classmate details, and parent contact numbers are completely filtered out on the server before response transmission.
- 📊 **75% Attendance Shortfall Predictor**: Computes the exact minimum number of consecutive future lectures a student must attend to cross the 75% Shivaji University / DBATU eligibility threshold using the integer formula:
  $$\text{Needed} = \max(0, \lceil 3T - 4A \rceil) \quad \text{where } T = \text{Total Conducted}, A = \text{Total Attended}$$
- 📑 **Formal Leave Management**: Students apply for leave with duplicate and past-date abuse blocking. Administrators approve or reject requests; upon approval, all lectures on that date are atomically marked **Present** via Google Apps Script `LockService`.
- 🔍 **Immutable Audit Trail**: Cell-by-cell attendance modifications require mandatory justification reasons, logging the admin identity, timestamp, student PRN, previous cell state, and new status.
- 🧪 **30-Point Automated Security Suite**: Comes with an automated security and API audit script verifying package vulnerability status, bundle secrecy, HTTP security headers, role authorization, rate limiting, and calculation precision.

---

## Architecture

```
+------------------------------------+
|  ESP8266 Biometric Hardware        |  --> Direct HTTP POST (values=...)
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|  Google Sheets (Master DB)         |  <-- Single Source of Truth
|  - Monthly Tabs (October 2026...)  |
|  - Leave_Applications Tab          |
|  - Audit_Logs Tab                  |
+-----------------+------------------+
                  ^
                  | Server-to-Server Only (Shared Secret Protected)
                  v
+------------------------------------+
|  Next.js 16 Backend-For-Frontend   |
|  - JWT Session Auth (HttpOnly)     |
|  - Anti-Abuse Rate Limiter         |
|  - Formula Injection Escaper       |
|  - 45s In-Memory GAS Quota Cache   |
+-----------------+------------------+
                  ^
                  | TLS + SameSite=Strict Cookie
                  v
+------------------------------------+
|  Neumorphic Soft UI Frontend       |
|  - Student Portal (/student)       |
|  - Admin & Faculty Hub (/admin)    |
+------------------------------------+
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.17.0 or higher (Tested on Node.js v24.14.1)
- **npm**: v9.0.0 or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
cd "d:\V10 2.O attendense"
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root (a template is provided in `.env.example`):
```env
# Google Apps Script Web App Deployment URL
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxxtCSDo9Mj9ci1oNbtsj37_LYz-olr2HUpXQiu7x4g1J5nmmWYm47rQxIhuzukfGUHBQ/exec

# Shared Secret Key between Next.js server and Google Apps Script
APPS_SCRIPT_SHARED_SECRET=SMART_ATTENDANCE_SECRET_KEY_2026

# High-entropy JWT Signing Secret (minimum 32 characters)
JWT_SECRET=c21hcnQtYXR0ZW5kYW5jZS1zZWNyZXQta2V5LTIwMjYtMjAyNy15c3Bt

# Administrator Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> [!NOTE]
> `.env.local` is git-ignored to prevent credential leaks. Never commit live secrets to version control.

### 4. Running the Application
To run in production mode (recommended):
```bash
npm run build
npm start
```
The server will start at `http://localhost:3000`.

To run in development mode:
```bash
npm run dev
```

---

## Running the Security & API Audit

The project includes an automated 30-point test runner that validates all security controls and API endpoints against the live production server:

```bash
node scratch/run_audit.js
```

### Audit Test Coverage
1. **Dependency Security**: Scans package lock for zero vulnerabilities (`npm audit`).
2. **Asset Protection**: Verifies sensitive files (`.env`, `.git/config`, `Code.gs`, `package.json`) return HTTP 404.
3. **Client Bundle Inspection**: Scans all 15 webpack bundles in `.next/static` to guarantee zero API URLs or secrets are bundled.
4. **HTTP Security Headers**: Validates `nosniff`, `X-Frame-Options: DENY`, `HSTS`, `CSP`, and removal of `X-Powered-By`.
5. **Access Control & RBAC**: Verifies unauthenticated and unauthorized requests to administrative endpoints receive HTTP 401 / 403.
6. **Authentication & Session Hardening**: Validates generic error messages on bad credentials, HttpOnly flag, and SameSite=Strict cookies.
7. **IDOR Isolation**: Proves that student sessions return strictly their own attendance record without leaking class arrays.
8. **Anti-Abuse Rate Limiter**: Simulates brute-force credential stuffing and asserts HTTP 429 lockout.
9. **Formula Injection Sanitization**: Tests prefix escaping for `=, +, -, @` inputs.
10. **Mathematical Formula Verification**: Validates four analytical edge cases for $x = \lceil 3T - 4A \rceil$.

---

## Default Access Credentials

| Portal | Role | Username / PRN | Password | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Student | `23067571372008` | `pass25` | Abhijeet Mahadev Shinde (Roll 25) |
| **Admin** | Administrator | `admin` | `admin123` | Class Teacher / HOD Portal |

> [!TIP]
> Student passwords in the master register follow the pattern `pass<roll>` (e.g. `pass26` for Roll 26). Students can change their passwords via the Student Dashboard once logged in.

---

## Google Apps Script v9.2 Deployment (Additive)

A hardened, 100% additive Google Apps Script has been prepared at:
`google-apps-script/Code.gs`

This script enhances the live Google Sheet with atomic leave approvals, audit logging, formula injection escaping, and password reset capabilities while retaining exact compatibility with the ESP8266 scanner.

### Updating the Script in Google Sheets
1. Open the spreadsheet: `Attendance Register - Final Year B V10 Percentage`.
2. Go to **Extensions** → **Apps Script**.
3. Replace the contents of `Code.gs` with the updated code from [google-apps-script/Code.gs](file:///d:/V10%202.O%20attendense/google-apps-script/Code.gs).
4. Click **Project Settings** (gear icon) → **Script Properties** → Add:
   - **Property**: `SHARED_SECRET`
   - **Value**: `SMART_ATTENDANCE_SECRET_KEY_2026`
5. Click **Deploy** → **Manage deployments** → Click the edit icon (pencil) → Change version to **New version** → Click **Deploy**.

---

## Project Structure

```
d:\V10 2.O attendense\
├── google-apps-script\
│   ├── Code.gs                  # Additive, hardened Google Apps Script (v9.2)
│   └── README.md                # Deployment instructions for Apps Script
├── google-apps-script-backup\   # Pristine backups of v8.5 and v9.0 deployed scripts
├── public\
│   └── logo.jpg                 # Official YSPM Satara College Crest
├── src\
│   ├── app\
│   │   ├── admin\page.tsx       # Faculty & Admin Hub (Matrix, Defaulters, Leaves, Audit)
│   │   ├── student\page.tsx     # Student Dashboard (75% Predictor, Calendar, Leaves, Profile)
│   │   ├── login\page.tsx       # Dual-role Neumorphic Login Page
│   │   ├── api\                 # BFF API routes (auth, attendance, leaves, audit, students)
│   │   ├── globals.css          # Neumorphic Soft UI design tokens & utilities
│   │   └── layout.tsx           # SEO metadata, Google Fonts, Root layout
│   ├── lib\
│   │   ├── auth.ts              # JWT signing, verification, HttpOnly cookie helpers
│   │   ├── config.ts            # Server-only environment variables & constants
│   │   ├── gasClient.ts         # Google Apps Script client with memory cache & retry
│   │   ├── rateLimit.ts         # In-memory sliding-window rate limiter & lockout
│   │   └── types.ts             # TypeScript data contracts & interfaces
│   └── middleware.ts            # Role guards, CSRF mitigation, Security headers
├── scratch\
│   └── run_audit.js             # Automated 30-point security audit suite
├── SECURITY.md                  # Comprehensive security report & DPDP Act compliance
└── README.md                    # Project documentation
```

---

## Institutional Attribution

- **Institution**: Yashoda Technical Campus, Satara (YSPM)
- **Department**: Faculty of Engineering, Department of Electronics & Telecommunication Engineering
- **Class**: Final Year B.Tech (Division B) — Semester VII (2026–27)
- **Class Teacher**: Prof. Subhash Suman
