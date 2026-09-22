# LRRS member sign-in

Surekuma reads LRRS SQL Server using the joins in `test_sqlsrv_2.php`.
It looks up a normalized email with a bound SQL parameter, requires `IsTDL = 1`
and a nonempty registration number, and includes **all years**. It never writes to LRRS.
Driver reference: https://tediousjs.github.io/node-mssql/

## Deployment

1. Run `npm ci` in `backend` to install the SQL Server driver.
2. For a new Surekuma MySQL database, import `surekuma_db.sql`. For an existing database, run only its `CREATE TABLE IF NOT EXISTS applicant_lrrs_registrations` statement.
   Fresh installations already include this table in `surekuma_db.sql`.
3. Set the `LRRS_*` variables from `backend/.env.example` in the deployed backend environment.
   Store the SQL Server credentials in `.env` / deployment secrets, never in frontend code.
   Set `LRRS_ENABLED=true` to activate member lookup.
4. The backend must be on a network/VPN that can reach the private LRRS server.
   Use `LRRS_INSTANCE` for named-instance discovery, or provide its actual TCP port in `LRRS_PORT`.
5. Configure the existing SMTP settings and restart the backend.
6. Optionally run `node scripts/check-lrrs.js member@example.com` with a known member email.
   This performs a read-only lookup and sends no email.

## Behavior

- An LRRS match creates an applicant account if needed and syncs its registration to
  `applicant_lrrs_registrations`. Existing applicants are refreshed on each OTP request.
- The normal one-time code is sent to that email. No token is issued until the code is verified.
- The application registration endpoint reads this mapping for the authenticated user.
  Both profile and employment registration fields use it when an application is saved;
  client-supplied registration numbers are ignored. Historical submitted/approved records are not rewritten.
- Admin and insurance officer accounts continue using their existing OTP login.
  Inactive accounts are never reactivated and roles are never promoted by LRRS lookup.
- With LRRS enabled, applicants without a matching TDL registration cannot request a new code.
  Connection failures return a retryable error; they do not fall back to stale registration data.
- Multiple distinct registration numbers for one email produce an explicit error, rather than
  assigning an arbitrary number. SLTDA must resolve these records or define a selection workflow.
- TDL history is not treated as proof of current licence validity or pension/insurance eligibility.
  No eligibility, expiry, or email-verification flags are inferred from the PHP query.
- `LRRS_ENABLED=false` retains the original local-account login for environments without LRRS.

## Verification

For temporary testing without LRRS connectivity, set `LRRS_TEST_EMAILS` to a comma-separated
list of explicitly approved test emails and restart the backend. Only existing active applicant
accounts can use this exception, and email OTP verification is still required. It does not create
or overwrite registration numbers. Clear this variable and restart when testing is finished.

Run `npm test` in `backend` for the isolated login, registration and authorization tests.
For a live acceptance check, use a known LRRS email, request and verify its code, open an
application and confirm the read-only registration number matches LRRS. Repeat with an
unknown email, an inactive local user, and a staff account. Live email delivery requires SMTP
and access to the member mailbox; automated tests do not send real email.
