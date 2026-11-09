# Google Apps Script v9.2 Hardened Backend Deployment Guide
**Smart Attendance System — Final Year B.Tech (Div B) Sem VII (2026-27)**  
**Yashoda Technical Campus, Satara (YSPM)**

This guide provides instructions to update your Google Apps Script project to **v9.2 Hardened Backend**. All updates are strictly **additive** and preserve **100% compatibility with existing ESP8266 biometric hardware scans, offline uploads, lookup commands, and Fast2SMS alerts**.

---

## 1. What's Added in v9.2 Hardened Backend

| Feature | Enhancement in v9.2 |
|---|---|
| **ESP8266 Hardware Compatibility** | **100% Unchanged & Preserved** (zero hardware re-flashing needed) |
| **BFF Shared Secret Verification** | Validates `APPS_SCRIPT_SHARED_SECRET` on all Web App calls |
| **Formula Injection Protection** | Automatically sanitizes text inputs starting with `=`, `+`, `-`, `@` with `'` |
| **Atomic Leave Approval** | Uses `LockService` to atomically mark all lectures for that date as `"P"` |
| **Leave Reversal Protection** | Stores previous cell states in `Audit_Logs` so rejections/reversals restore exact previous values |
| **Audit Trail Integration** | Dedicated `Audit_Logs` tab records who, what, when, old value, and new value |
| **Admin Password Reset** | Allows admin to reset passwords and force change on next login |
| **Student Password Update** | Minimum length (8 chars) enforcement and authenticated change |

---

## 2. Deployment Instructions

### Step 1: Open Your Existing Google Sheet
1. Open your Google Spreadsheet: **"Attendance Register - Final Year B V10 Percentage"**.
2. Click **Extensions** > **Apps Script** in the top menu bar.

### Step 2: Replace Code.gs
1. In Apps Script editor, open `Code.gs`.
2. Select all (`Ctrl + A`) and replace with the contents of `google-apps-script/Code.gs`.
3. Click the **Save** icon (`Ctrl + S`).

### Step 3: Configure Script Properties
1. In the left sidebar of Apps Script, click **Project Settings** (gear icon ⚙️).
2. Under **Script Properties**, click **Add script property** / edit:
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: `<your-secure-admin-password>`
   - `APPS_SCRIPT_SHARED_SECRET`: `<your-shared-secret>` (e.g. matching `APPS_SCRIPT_SHARED_SECRET` in `.env`)
   - `ATTENDANCE_SS_ID`: `<your-spreadsheet-id-from-url>`
   - `FAST2SMS_API_KEY`: `<your-fast2sms-api-key>` (optional)
3. Click **Save script properties**.

### Step 4: Deploy as Web App
1. Click **Deploy** > **Manage deployments**.
2. Click the edit pencil icon on your existing deployment (or **New deployment** > **Web app**).
3. Set **Execute as**: `Me (<your-email>)`.
4. Set **Who has access**: `Anyone`.
5. Click **Deploy**.
6. Note: If you create a new deployment, copy the Web App URL and set it as `APPS_SCRIPT_URL` in your website's `.env`.
