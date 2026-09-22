# Surekuma email-only portal

Start the existing MySQL/MariaDB service and configure `backend/.env` with the database connection and `JWT_SECRET`. From `backend`, run `npm start`; from `frontend`, run `npm run dev`. Default URLs: http://localhost:5000 and http://localhost:5173.

## Accounts

The `users` table contains `id`, `email`, `role`, `status`, and `created_at`. Login accepts the email of an existing active account. Public account creation is disabled. With LRRS enabled, registered TDL members are automatically provisioned as applicants before the OTP step; staff accounts are provisioned by an administrator. See [LRRS setup](LRRS-INTEGRATION.md). The server reads the role from the database and the UI opens the admin or applicant workspace. It rechecks account status and role on authenticated requests. SLTDA officers use the `admin` role. Insurance company officers use `insurance_officer` and can only view Admin-approved applications in their separate dashboard. The legacy `sltda_officer` role is not used for insurance access.

Sign-in requires a six-digit email OTP. The entered email is trimmed and lowercased, then matched to an active account in `users`. The code is emailed to that account's stored address. Verification requires the same account, challenge ID, and code before a session token is issued.

## OTP database and delivery

For an existing database, apply `backend/migrations/003_add_applicant_otp_challenges.sql` if the table is missing. Fresh imports of `surekuma_db.sql` include the table. OTPs are saved as keyed hashes in `applicant_otp_challenges`, linked by `user_id` to the account email; plaintext codes are not stored or logged. Codes expire after ten minutes, allow five incorrect attempts, and can only be used once. Resending replaces the challenge, with a 60-second cooldown and five sends per hour.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` in `backend/.env`; `SMTP_FROM` optionally overrides the sender. Restart the backend after changing settings. Missing credentials return a service error, including in development. The challenge is committed to the database before sending email. SMTP rejection marks it invalidated. Resending creates a new record and invalidates previous unused codes. Successful verification sets `used_at`; incorrect entries increment `attempts`. The stored email must match the entered email. Failed deliveries also count toward resend limits to prevent mail request loops. Success means the SMTP provider accepted the email; check spam if delivery is delayed.

The SQL export reflects the five-column user schema. No live schema migration is needed when those columns have already been removed. Applicant names still belong to `applicant_profiles` and are retained.

The single-section home and login screens use locally served photographs credited in `frontend/public/PHOTO-CREDITS.md`. Parallax and motion effects respect the reduced-motion accessibility preference.

## Checks

Run `npm test` from `backend` for authentication tests, and `npm run build` / `npm run lint` from `frontend` for frontend checks.
