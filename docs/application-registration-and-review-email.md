# Account registration and review emails

Run `backend/migrations/007_registration_and_review_email.sql` against an existing database before starting the updated backend. The main SQL dump includes the same schema for new installations. Migration 007 is safe to rerun and has been applied to the local development database.

## SLTDA registration

`applicant_lrrs_registrations.user_id` links a registration to `users.id`. The authenticated user's ID and email select that record. Applicant information and employment show the number as text, and saving always reads the database number rather than trusting the request payload.

An administrator must populate the correct `sltda_registration_no` for each account in `applicant_lrrs_registrations`. An account without a record displays “No registration number on file.” No placeholder number is generated. Application profile copies are no longer globally unique, because one account may have multiple applications.

## Review delivery

A review of a submitted application commits its decision, in-app notification and email outbox record in one database transaction. Emails go to the applicant's `users.email`, not the editable application contact email, and include the application number, decision and administrator comment.

Delivery uses the same `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and optional `SMTP_FROM` settings as sign-in emails. If SMTP fails, the decision remains saved and the email stays pending. The backend retries due messages every minute, including after a restart. The admin page reports whether email was sent or queued. “Sent” means accepted by the SMTP provider; inbox placement is controlled by the mail provider.

Queue records are in `review_email_outbox` (`status`, `attempts`, `next_attempt_at`, `sent_at`). Restart the backend after applying code/schema changes to start the retry worker. A failed or interrupted worker claim becomes eligible again after five minutes. As with SMTP queues generally, a process crash after provider acceptance but before marking the record sent can cause a repeated email.

Tests mock email delivery and database operations, so running `npm test` does not send real applicant emails.
