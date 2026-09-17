# Email OTP authentication

Login is now email → Send OTP → enter the emailed six-digit code → Verify OTP → existing role-based dashboard. Both member and administrator sign-in use this flow. New registration requires a full name and email, then the user selects Sign in to verify ownership. Existing accounts keep their email, role and data. The password login route has been removed; existing JWTs and protected routes keep working as before.

## Configure email delivery

Nodemailer has been added to package.json and package-lock.json. On another checkout run `npm.cmd ci` from `backend`. No SMS package or phone number is needed.

Fill in these variables in **backend/.env**, using credentials from your SMTP email provider:

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

`SMTP_FROM` is the provider-approved sender email address (optionally `Surekuma <sender@example.com>`). `SMTP_USER` and `SMTP_PASS` authenticate that sender; use your provider's SMTP credential/app password. These are not the recipient's credentials. Delivery goes to the registered email entered on the sign-in page. Use port 587 for STARTTLS or 465 for implicit TLS. Never put these secrets in frontend files or commit .env.

The adapter uses [Nodemailer's SMTP transport](https://nodemailer.com/smtp). Until all credentials are configured, Send OTP returns a clear 503 configuration message. Delivery failures do not expose provider errors or the code, and invalidate that pending code. No console or development OTP bypass is provided.

Restart the backend after filling in .env:

```powershell
cd backend
npm.cmd run dev
```

Stop an existing server on port 5000 first. Run the frontend with `npm.cmd run dev` from `frontend`.

## Database

The running local database was migrated without deleting user/application data. For another existing installation:

```powershell
cd backend
npm.cmd run migrate:email-otp
```

The migration script is safe to rerun. The equivalent one-time SQL is `migrations/001_email_otp.sql`. Do not rerun the root `surekuma_db.sql` on existing data: that full setup script drops and recreates tables. Its users definition is updated for fresh installations.

Changes are all within `users`:

```sql
ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL,
    ADD COLUMN otp VARCHAR(255) NULL,
    ADD COLUMN otp_expires_at DATETIME NULL,
    ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN otp_last_sent_at DATETIME NULL,
    ADD COLUMN otp_send_count INT NOT NULL DEFAULT 0,
    ADD COLUMN otp_window_started_at DATETIME NULL;
```

Existing password hashes are retained but are no longer used for login. No separate OTP table is created.

## API and protections

- `POST /api/auth/register`: `{ "full_name": "Your name", "email": "your-address@example.com" }`
- `POST /api/auth/send-otp`: `{ "email": "your-address@example.com" }`
- `POST /api/auth/verify-otp`: `{ "email": "your-address@example.com", "otp": "123456" }` (use the code actually received).

Email addresses are trimmed/lowercased and validated. Codes use cryptographic randomness and bcrypt hashing with cost 12. They expire after five minutes, allow five incorrect attempts, and are cleared after success. MySQL row locks serialize verify/resend operations to prevent concurrent reuse. Successful verification returns the existing JWT/user shape, with the stored role rather than a client-supplied role.

Each account can request five emails per hour with a 60-second resend cooldown; these counters persist in users. IP limits are 10 sends/15 minutes, 30 verifications/15 minutes, and 10 registrations/hour. IP counters are in memory for this single-server deployment. Multiple server instances need shared IP limits (for example at the reverse proxy). Do not enable arbitrary `trust proxy`, which would let clients spoof their IP. Unknown/inactive accounts receive a generic send response but are not emailed or authenticated.

## Test the complete flow

1. Configure SMTP and restart the backend. Use an existing account's email, or create an account with an inbox you control.
2. On Sign in, enter that email and select Send OTP. Check that inbox, including spam.
3. Enter the received six-digit code. Verify that the correct dashboard opens and protected application requests work. Admin accounts retain admin access.
4. Sign out and try reusing the code: it must fail. Request another code and wait more than five minutes: it must fail too.
5. Try five incorrect codes: the pending code becomes unusable. Resend before 60 seconds and repeated requests beyond the hourly budget must be rejected.
6. Change email on the OTP screen to return to the email step. A new code must be requested for that account.

Automated checks: `npm.cmd test` in backend, and `npm.cmd run build` / `npm.cmd run lint` in frontend. Backend tests need the configured MySQL database and use a temporary users table plus a fake mail adapter; they never send email or modify existing accounts. Live inbox delivery must be checked after configuring SMTP.

## Files changed for email OTP

- `frontend/src/App.jsx`: existing auth screen, loading/errors, resend countdown, change email, registration without passwords.
- `backend/controllers/authController.js`: registration, OTP requests/verification, JWT issuance.
- `backend/routes/authRoutes.js`: OTP endpoints and request limits.
- `backend/middleware/authRateLimit.js`: bounded per-IP limiter.
- `backend/services/emailService.js`: reusable SMTP delivery.
- `surekuma_db.sql`: updated fresh-install users schema.
- `backend/migrations/001_email_otp.sql` and `backend/scripts/migrateEmailOtp.js`: existing-database migration.
- `backend/package.json` and `backend/package-lock.json`: Nodemailer, migration/test commands.
- `backend/.env.example` and local ignored `backend/.env`: SMTP settings.
- `backend/tests/emailOtp.test.js`: MySQL-backed OTP and rate-limit checks.
- `backend/EMAIL_OTP.md`: configuration and testing instructions.
