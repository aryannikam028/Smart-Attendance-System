# Security Architecture & Audit Report — Smart Attendance System

## Executive Summary

The **Smart Attendance System** (v2.0) has been engineered under a **Zero-Trust, Security-by-Design** methodology specifically adapted for the academic environment of **Yashoda Technical Campus, Satara (YSPM)** — Final Year B.Tech (Division B), Semester VII (2026–27).

This document details the threat model, technical security controls, compliance alignment with the **Digital Personal Data Protection Act, 2023 (India DPDP Act)**, and the empirical results of our automated 30-point security audit.

---

## 1. System Architecture & Threat Model

The architecture decouples biometric edge devices, user browsers, and the Google Sheets database through a **Backend-For-Frontend (BFF)** proxy pattern.

```
+---------------------------------------+
|   ESP8266 Hardware (Optical Sensor)   |  <-- POST raw CSV (values=101,25,...)
+-------------------+-------------------+
                    |
                    v (Direct Web App Endpoint - Untouched)
+-------------------------------------------------------------------------------+
|                       Google Sheets + Google Apps Script                      |
|                  Spreadsheet: Attendance Register - Final Year B V10          |
+-------------------+-----------------------------------------------------------+
                    ^
                    | (Server-to-Server Only - Protected by Shared Secret)
+-------------------+-----------------------------------------------------------+
|                          Next.js Backend-For-Frontend                         |
|   - Authentication Engine (JWT, HttpOnly, SameSite=Strict)                    |
|   - Strict IDOR Firewall (Scoped student projection)                          |
|   - Rate Limiter & Lockout (Brute force defense)                              |
|   - Formula Injection Escaper (DDE defense)                                   |
|   - Short-lived Memory Caching (GAS quota optimization)                       |
+-------------------+-----------------------------------------------------------+
                    ^
                    | (Encrypted TLS - HttpOnly Session Cookie)
+-------------------+-----------------------------------------------------------+
|                    Browser Client (Neumorphic Next.js UI)                     |
|          Student Portal (PRN)   |   Faculty & Admin Hub (Credentials)         |
+-------------------------------------------------------------------------------+
```

### STRIDE Threat Modeling Analysis

| STRIDE Category | Threat Vector | Technical Mitigation Implemented |
| :--- | :--- | :--- |
| **Spoofing** | Unauthorized student pretending to be another student or admin | Cryptographically signed HS256 JWT in HttpOnly, SameSite=Strict cookies; constant-time string comparisons (`crypto.timingSafeEqual`) to defeat timing attacks; role verification at middleware and endpoint levels. |
| **Tampering** | Student modifying attendance cells or leaves | Strict server-side RBAC denying write operations to students (HTTP 403); formula injection protection prefixing `=, +, -, @` with `'`; atomic lock execution via Google Apps Script `LockService`. |
| **Repudiation** | Administrator altering attendance without proof | Mandatory audit log recording timestamp, admin ID, student PRN, previous cell state, new cell state, and justification reason before commit. |
| **Information Disclosure** | Student extracting full roster or parent phone numbers (IDOR) | Server-side IDOR filter: Student role receives only their own record; `students` array stripped completely; parent phone numbers masked in API serialization; zero secrets leaked in client webpack bundles. |
| **Denial of Service** | Credential stuffing or hammering Apps Script quota | In-memory sliding-window rate limiting on login (5 attempts / 5 mins, 10 min lockout); 45-second memory caching in BFF reducing redundant Google Sheets read quotas. |
| **Elevation of Privilege** | Student calling administrative endpoints (`/api/attendance/update`) | Layered defense: Edge middleware role check + endpoint-level JWT claims check + Apps Script role authorization gate. |

---

## 2. Core Security Controls

### 2.1. Secret Zero-Exposure
- The Google Apps Script deployment URL (`APPS_SCRIPT_URL`) and the shared secret (`APPS_SCRIPT_SHARED_SECRET`) are strictly maintained in `.env.local` on the Node.js server.
- **Zero `NEXT_PUBLIC_` Exposure**: No sensitive variables are prefixed with `NEXT_PUBLIC_`.
- **Bundle Audit**: Automated AST scanning of all 15 production webpack JS and CSS bundles confirmed 0 instances of API URLs, secrets, or administrative credentials.

### 2.2. Session Management & Cookie Hardening
- **Token Format**: Compact JSON Web Token (JWT) signed with HMAC-SHA256 using a high-entropy 256-bit secret.
- **Cookie Security Attributes**:
  - `HttpOnly`: Accessible only to the HTTP protocol; inaccessible to `document.cookie` (XSS mitigation).
  - `SameSite=Strict`: Never transmitted with cross-site requests, mitigating Cross-Site Request Forgery (CSRF).
  - `Secure`: Transmitted only over HTTPS in production.
  - `Path=/`: Scoped to the application root.
  - `MaxAge`: 7,200 seconds (2 hours), ensuring short session lifetime.

### 2.3. IDOR Defense (Insecure Direct Object Reference)
Students querying `/api/attendance`:
1. The student session is extracted and verified from the encrypted JWT.
2. The student's PRN is isolated.
3. The BFF strips all other 72 students from the memory buffer before generating the response.
4. The response schema outputs a single `student` object and subject-level stats. The `students` array is completely omitted.

### 2.4. Formula Injection (CSV / Spreadsheet Injection) Mitigation
Any user-supplied string written to Google Sheets or exported to CSV (student names, leave reasons, admin override notes) is sanitized via `sanitizeForSheet()`:
```typescript
export function sanitizeForSheet(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+@-]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return val;
}
```
This neutralizes dynamic formula evaluation (e.g., `=IMPORTXML`, `=HYPERLINK`, `=cmd|' /C calc'!A0`) in Microsoft Excel, LibreOffice Calc, and Google Sheets.

### 2.5. HTTP Security Headers
The production server automatically injects strict security headers on every response:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
X-Powered-By: [REMOVED]
```

---

## 3. Compliance with India DPDP Act, 2023

The system processes biometric logs and academic data for university students. The implementation aligns with key principles of the **Digital Personal Data Protection Act, 2023 (DPDP Act)**:

1. **Lawful Purpose & Notice (Section 4 & 5)**: Data is processed strictly for academic attendance compliance, Shivaji University / DBATU ordinance compliance, and examination eligibility. Notice is visibly posted on the portal landing page.
2. **Data Minimization (Section 6)**: The application does NOT expose raw biometric minutiae over HTTP. Minutiae remain on the optical sensor chip. The ESP8266 transmits only numeric enrollment IDs (`parts[1] = "25"`).
3. **Parent Phone Protection**: Parent contact numbers stored in Column 4 of the master sheet are excluded from student-facing API responses and masked in directory views.
4. **Accuracy & Correction (Section 12)**: The Leave Application workflow and Admin cell override modal provide institutional mechanisms for students to contest and correct erroneous absence marks.
5. **Auditability (Section 8)**: An immutable `Audit_Logs` sheet records every administrative override with mandatory justification, ensuring non-repudiation and transparency.

---

## 4. Automated Security Audit Results

All 30 automated test cases executed by `scratch/run_audit.js` on the live production server completed with **100% PASS**:

| Test ID | Category | Description | Status |
| :---: | :--- | :--- | :---: |
| **SEC-01** | Dependency Audit | `npm audit` zero known vulnerabilities across all packages | **PASS** |
| **SEC-02** | Asset Exposure | Block direct access to `/.env` (HTTP 404) | **PASS** |
| **SEC-03** | Asset Exposure | Block direct access to `/.env.local` (HTTP 404) | **PASS** |
| **SEC-04** | Asset Exposure | Block direct access to `/.env.example` (HTTP 404) | **PASS** |
| **SEC-05** | Asset Exposure | Block direct access to `/.git/config` (HTTP 404) | **PASS** |
| **SEC-06** | Asset Exposure | Block direct access to `/google-apps-script/Code.gs` (HTTP 404) | **PASS** |
| **SEC-07** | Asset Exposure | Block direct access to `/package.json` (HTTP 404) | **PASS** |
| **SEC-08** | Client Bundle | Scanned 15 production webpack assets for leaked secrets (0 leaks) | **PASS** |
| **SEC-09** | HTTP Headers | `X-Content-Type-Options: nosniff` present | **PASS** |
| **SEC-10** | HTTP Headers | `X-Frame-Options: DENY` present | **PASS** |
| **SEC-11** | HTTP Headers | `Strict-Transport-Security (HSTS)` present | **PASS** |
| **SEC-12** | HTTP Headers | `Content-Security-Policy (CSP)` present | **PASS** |
| **SEC-13** | HTTP Headers | `X-Powered-By` header stripped | **PASS** |
| **SEC-14** | Access Control | Unauthenticated `GET /api/attendance` rejected (401) | **PASS** |
| **SEC-15** | Access Control | Unauthenticated `GET /api/audit` rejected (403) | **PASS** |
| **SEC-16** | Access Control | Unauthenticated `GET /api/leaves` rejected (401) | **PASS** |
| **SEC-17** | Access Control | Unauthenticated `POST /api/attendance/update` rejected (403) | **PASS** |
| **SEC-18** | Access Control | Unauthenticated `POST /api/leaves/approve` rejected (403) | **PASS** |
| **SEC-19** | Access Control | Unauthenticated `POST /api/leaves/reject` rejected (403) | **PASS** |
| **SEC-20** | Authentication | Invalid student password rejected with generic 401 error | **PASS** |
| **SEC-21** | Authentication | Valid student login succeeds with signed JWT | **PASS** |
| **SEC-22** | Cookie Security | Session cookie marked `HttpOnly` | **PASS** |
| **SEC-23** | Cookie Security | Session cookie marked `SameSite=Strict` | **PASS** |
| **SEC-24** | Authentication | Valid admin login succeeds with signed JWT | **PASS** |
| **SEC-25** | IDOR Defense | Student attendance payload contains strictly own record (`prn: 23067571372008`), no class array | **PASS** |
| **SEC-26** | Authorization | Student attempting `POST /api/attendance/update` rejected (403) | **PASS** |
| **SEC-27** | Authorization | Student attempting `POST /api/leaves/approve` rejected (403) | **PASS** |
| **SEC-28** | Abuse Prevention | Brute-force login limiter triggers HTTP 429 Too Many Requests | **PASS** |
| **SEC-29** | Injection Defense | Formula prefix escaping (`=, +, -, @` -> `'`) verified | **PASS** |
| **SEC-30** | Math Integrity | 75% shortfall formula $x = \max(0, \lceil 3T - 4A \rceil)$ verified across 4 analytical cases | **PASS** |

---

## 5. Residual Risks & Operational Hardening

1. **Google Apps Script Execution Limits**:
   - Google Workspace / personal Gmail accounts have daily URL Fetch and script runtime quotas (e.g., 6 minutes per single execution).
   - *Mitigation*: The BFF implements a 45-second in-memory response cache and optimistic locking to prevent repetitive Apps Script execution spikes.
2. **Secret Rotation**:
   - If `JWT_SECRET` or `APPS_SCRIPT_SHARED_SECRET` is changed in `.env.local`, all active sessions will invalidate gracefully. The Google Apps Script `PropertiesService` must be updated concurrently to match.
3. **Database Concurrency**:
   - Google Sheets operates on a cell grid rather than a traditional relational ACID database.
   - *Mitigation*: All write actions use `LockService.getScriptLock()` with a 15-second timeout in Apps Script to serialize concurrent writes.
