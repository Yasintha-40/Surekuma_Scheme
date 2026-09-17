-- Existing installations: additive migration, preserves users and applications.
ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL,
    ADD COLUMN otp VARCHAR(255) NULL,
    ADD COLUMN otp_expires_at DATETIME NULL,
    ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN otp_last_sent_at DATETIME NULL,
    ADD COLUMN otp_send_count INT NOT NULL DEFAULT 0,
    ADD COLUMN otp_window_started_at DATETIME NULL;
