# LRRS export sign-in

Import the supplied JSON export into the Surekuma MySQL database:

```powershell
cd backend
node scripts/import-lrrs.js "C:\path\to\export.json" --dry-run
node scripts/import-lrrs.js "C:\path\to\export.json"
```

The importer creates the two required registry tables, then replaces the imported snapshot in one transaction. It stores only normalized `email` and trimmed `reg_no`. Blank or invalid pairs are skipped, identical pairs are deduplicated, and multiple distinct registrations for one email are retained so sign-in can return an administrator-review message instead of assigning the wrong number. Summary counts contain no personal data. Review skipped and ambiguous source records with SLTDA before correcting the export and importing again.

If MySQL is offline, generate a private SQL file and run it against the Surekuma database when available:

```powershell
node scripts/import-lrrs.js "C:\path\to\export.json" --sql private/lrrs-import.sql
```

Create the output directory first. `backend/private/` is excluded from Git. Do not publish the JSON or generated SQL file.

After importing, set `LRRS_ENABLED=true`, `LRRS_SOURCE=import`, and clear `LRRS_TEST_EMAILS` in `backend/.env`; restart the backend. Keep the existing SMTP credentials for delivery. Use `LRRS_SOURCE=sqlserver` to select the original live lookup instead. There is no silent fallback between sources.

On an unambiguous email match, the existing sign-in flow creates or synchronizes an applicant account and registration mapping before requesting the OTP. Email verification is still required to log in. Staff roles and inactive accounts remain protected. The application form displays the matched number in applicant and employment sections; the backend saves that authoritative number even if a client submits another one. Unknown emails receive no OTP. Export expiry dates are not treated as an insurance or pension eligibility decision.

`npm test` uses mocked mail and database connections and sends no emails. Real delivery requires a running MySQL server and working SMTP credentials.
