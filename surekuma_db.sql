CREATE DATABASE IF NOT EXISTS surekuma_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE surekuma_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sltda_recommendations;
DROP TABLE IF EXISTS application_reviews;
DROP TABLE IF EXISTS application_status_history;
DROP TABLE IF EXISTS beneficiaries;
DROP TABLE IF EXISTS employment_categories;
DROP TABLE IF EXISTS employment_details;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS application_social_security;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS applicants;
DROP TABLE IF EXISTS divisional_secretariats;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS tourism_categories;
DROP TABLE IF EXISTS social_security_types;
DROP TABLE IF EXISTS pension_schemes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS application_schemes;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    user_id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('APPLICANT','SLTDA_OFFICER','SSSB_OFFICER','ADMIN') NOT NULL DEFAULT 'APPLICANT',
    status ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE districts (
    district_id INT NOT NULL AUTO_INCREMENT,
    district_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (district_id),
    UNIQUE KEY uq_district_name (district_name)
) ENGINE=InnoDB;

CREATE TABLE divisional_secretariats (
    ds_id INT NOT NULL AUTO_INCREMENT,
    district_id INT NOT NULL,
    ds_name VARCHAR(150) NOT NULL,
    PRIMARY KEY (ds_id),
    UNIQUE KEY uq_ds_district_name (district_id, ds_name),
    CONSTRAINT fk_ds_district FOREIGN KEY (district_id) REFERENCES districts(district_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE applicants (
    applicant_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    nic VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('MALE','FEMALE','OTHER') NOT NULL,
    nationality VARCHAR(80) NOT NULL DEFAULT 'Sri Lankan',
    permanent_address VARCHAR(500) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (applicant_id),
    UNIQUE KEY uq_applicant_user (user_id),
    UNIQUE KEY uq_applicant_nic (nic),
    CONSTRAINT fk_applicant_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE pension_schemes (
    scheme_id INT NOT NULL AUTO_INCREMENT,
    scheme_code VARCHAR(50) NOT NULL,
    scheme_name VARCHAR(150) NOT NULL,
    duration_years INT NOT NULL,
    default_monthly_contribution DECIMAL(12,2),
    description VARCHAR(1000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scheme_id),
    UNIQUE KEY uq_pension_scheme_code (scheme_code),
    CONSTRAINT chk_scheme_duration_years CHECK (duration_years > 0),
    CONSTRAINT chk_default_monthly_contribution CHECK
        (default_monthly_contribution IS NULL OR default_monthly_contribution >= 0)
) ENGINE=InnoDB;

CREATE TABLE applications (
    application_id BIGINT NOT NULL AUTO_INCREMENT,
    applicant_id BIGINT NOT NULL,
    application_no VARCHAR(50) NOT NULL,
    ds_id INT NOT NULL,
    scheme_id INT NOT NULL,
    monthly_contribution DECIMAL(12,2) NOT NULL,
    start_month DATE NOT NULL,
    duration_months INT NOT NULL,
    status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','RETURNED','RECOMMENDED','APPROVED','REJECTED')
        NOT NULL DEFAULT 'DRAFT',
    submitted_at DATE,
    reviewed_at DATE,
    rejection_reason VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (application_id),
    UNIQUE KEY uq_application_no (application_no),
    KEY idx_application_applicant (applicant_id),
    KEY idx_application_ds (ds_id),
    KEY idx_application_scheme (scheme_id),
    KEY idx_application_status (status),
    CONSTRAINT fk_application_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_application_ds FOREIGN KEY (ds_id) REFERENCES divisional_secretariats(ds_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_application_pension_scheme FOREIGN KEY (scheme_id) REFERENCES pension_schemes(scheme_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_application_monthly_contribution CHECK (monthly_contribution >= 0),
    CONSTRAINT chk_application_duration_months CHECK (duration_months > 0)
) ENGINE=InnoDB;

CREATE TABLE social_security_types (
    security_type_id INT NOT NULL AUTO_INCREMENT,
    security_name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (security_type_id),
    UNIQUE KEY uq_security_name (security_name)
) ENGINE=InnoDB;

CREATE TABLE application_social_security (
    application_id BIGINT NOT NULL,
    security_type_id INT NOT NULL,
    is_entitled BOOLEAN NOT NULL DEFAULT FALSE,
    remarks VARCHAR(500),
    PRIMARY KEY (application_id, security_type_id),
    CONSTRAINT fk_app_security_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_app_security_type FOREIGN KEY (security_type_id) REFERENCES social_security_types(security_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE tourism_categories (
    category_id INT NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_tourism_category_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE employment_details (
    employment_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    service_years INT NOT NULL DEFAULT 0,
    service_months INT NOT NULL DEFAULT 0,
    is_sltda_registered BOOLEAN NOT NULL DEFAULT FALSE,
    sltda_registration_no VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (employment_id),
    UNIQUE KEY uq_employment_application (application_id),
    CONSTRAINT fk_employment_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_service_years CHECK (service_years >= 0),
    CONSTRAINT chk_service_months CHECK (service_months BETWEEN 0 AND 11)
) ENGINE=InnoDB;

CREATE TABLE employment_categories (
    employment_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    other_category_name VARCHAR(150),
    PRIMARY KEY (employment_id, category_id),
    CONSTRAINT fk_emp_category_employment FOREIGN KEY (employment_id) REFERENCES employment_details(employment_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_emp_category_category FOREIGN KEY (category_id) REFERENCES tourism_categories(category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE family_members (
    family_member_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    relationship ENUM('SPOUSE','SON','DAUGHTER','FATHER','MOTHER','OTHER') NOT NULL,
    id_no VARCHAR(50),
    marital_status ENUM('SINGLE','MARRIED','DIVORCED','WIDOWED','OTHER'),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (family_member_id),
    KEY idx_family_application (application_id),
    CONSTRAINT fk_family_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE beneficiaries (
    beneficiary_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(80) NOT NULL,
    nic_or_birth_certificate_no VARCHAR(50) NOT NULL,
    contact_no VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (beneficiary_id),
    KEY idx_beneficiary_application (application_id),
    CONSTRAINT fk_beneficiary_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE application_status_history (
    history_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    old_status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','RETURNED','RECOMMENDED','APPROVED','REJECTED'),
    new_status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','RETURNED','RECOMMENDED','APPROVED','REJECTED') NOT NULL,
    changed_by BIGINT NOT NULL,
    remarks VARCHAR(1000),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (history_id),
    KEY idx_status_history_application (application_id),
    KEY idx_status_history_changed_by (changed_by),
    CONSTRAINT fk_status_history_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE application_reviews (
    review_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    officer_id BIGINT NOT NULL,
    decision ENUM('APPROVED','REJECTED','RETURNED','RECOMMENDED') NOT NULL,
    remarks VARCHAR(1000),
    reviewed_at DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (review_id),
    KEY idx_review_application (application_id),
    KEY idx_review_officer (officer_id),
    CONSTRAINT fk_review_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_review_officer FOREIGN KEY (officer_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sltda_recommendations (
    recommendation_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    recommended_by BIGINT NOT NULL,
    approved_by BIGINT NOT NULL,
    sltda_percentage DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    applicant_percentage DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    sltda_contribution_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    applicant_contribution_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_start_month DATE NOT NULL,
    number_of_months INT NOT NULL,
    payment_end_month DATE NOT NULL,
    pension_start_month DATE NOT NULL,
    recommendation_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recommendation_id),
    UNIQUE KEY uq_recommendation_application (application_id),
    KEY idx_recommendation_recommended_by (recommended_by),
    KEY idx_recommendation_approved_by (approved_by),
    CONSTRAINT fk_recommendation_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_recommended_by FOREIGN KEY (recommended_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_recommendation_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_sltda_percentage CHECK (sltda_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_applicant_percentage CHECK (applicant_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_total_percentage CHECK (sltda_percentage + applicant_percentage = 100.00),
    CONSTRAINT chk_sltda_contribution CHECK (sltda_contribution_amount >= 0),
    CONSTRAINT chk_applicant_contribution CHECK (applicant_contribution_amount >= 0),
    CONSTRAINT chk_recommendation_months CHECK (number_of_months > 0)
) ENGINE=InnoDB;

CREATE TABLE memberships (
    membership_id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    membership_no VARCHAR(100) NOT NULL,
    certificate_no VARCHAR(100) NOT NULL,
    account_opened_date DATE NOT NULL,
    scheme_registered VARCHAR(150) NOT NULL,
    registered_by BIGINT NOT NULL,
    registered_at DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (membership_id),
    UNIQUE KEY uq_membership_application (application_id),
    UNIQUE KEY uq_membership_no (membership_no),
    UNIQUE KEY uq_certificate_no (certificate_no),
    CONSTRAINT fk_membership_application FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_membership_registered_by FOREIGN KEY (registered_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_application_pension_scheme AS
SELECT
    a.application_id,
    a.application_no,
    a.applicant_id,
    a.scheme_id,
    ps.scheme_code,
    ps.scheme_name,
    a.monthly_contribution,
    a.start_month,
    a.duration_months,
    a.status
FROM applications a
JOIN pension_schemes ps ON ps.scheme_id = a.scheme_id;
