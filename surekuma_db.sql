-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Sep 14, 2026 at 10:45 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `surekuma_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `applicant_profiles`
--

CREATE TABLE `applicant_profiles` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `contact_number` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `divisional_secretariat` varchar(150) DEFAULT NULL,
  `sltda_registration_no` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

CREATE TABLE `applications` (
  `id` int(11) NOT NULL,
  `application_no` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `scheme_id` int(11) DEFAULT NULL,
  `start_month` date DEFAULT NULL,
  `monthly_contribution` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','submitted','under_review','correction_required','approved','rejected') DEFAULT 'draft',
  `submitted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `applications`
--

INSERT INTO `applications` (`id`, `application_no`, `user_id`, `status`, `submitted_at`, `created_at`, `updated_at`) VALUES
(1, 'SK-2026-68040467', 1, 'draft', NULL, '2026-09-14 06:40:40', '2026-09-14 06:40:40'),
(2, 'SK-2026-68046681', 1, 'draft', NULL, '2026-09-14 06:40:46', '2026-09-14 06:40:46'),
(3, 'SK-2026-68056816', 1, 'draft', NULL, '2026-09-14 06:40:56', '2026-09-14 06:40:56'),
(4, 'SK-2026-68057542', 1, 'draft', NULL, '2026-09-14 06:40:57', '2026-09-14 06:40:57'),
(5, 'SK-2026-68523113', 1, 'draft', NULL, '2026-09-14 06:48:43', '2026-09-14 06:48:43');

-- --------------------------------------------------------

--
-- Table structure for table `application_reviews`
--

CREATE TABLE `application_reviews` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` enum('approved','rejected','correction_required') NOT NULL,
  `comment` text DEFAULT NULL,
  `reviewed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- --------------------------------------------------------

--
-- Table structure for table `beneficiaries`
--

CREATE TABLE `beneficiaries` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `full_name` varchar(200) DEFAULT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `contact_number` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employment_details`
--

CREATE TABLE `employment_details` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `service_years` int(11) DEFAULT 0,
  `service_months` int(11) DEFAULT 0,
  `sltda_registered` tinyint(1) DEFAULT 0,
  `sltda_registration_no` varchar(100) DEFAULT NULL,
  `registration_category` varchar(100) DEFAULT NULL,
  `other_category` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_members`
--

CREATE TABLE `family_members` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `memberships`
--

CREATE TABLE `memberships` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `membership_id` varchar(50) NOT NULL,
  `certificate_no` varchar(50) NOT NULL,
  `account_opened_on` date DEFAULT NULL,
  `scheme_registered` varchar(150) DEFAULT NULL,
  `officer_signature_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `pension_schemes`
--

CREATE TABLE `pension_schemes` (
  `id` int(11) NOT NULL,
  `scheme_name` varchar(150) NOT NULL,
  `duration_years` int(11) NOT NULL,
  `monthly_contribution` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sltda_recommendations`
--

CREATE TABLE `sltda_recommendations` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `officer_id` int(11) DEFAULT NULL,
  `is_recommended` tinyint(1) DEFAULT 0,
  `sltda_contribution_percent` decimal(5,2) DEFAULT 40.00,
  `applicant_contribution_percent` decimal(5,2) DEFAULT 60.00,
  `sltda_contribution_amount` decimal(10,2) DEFAULT NULL,
  `applicant_contribution_amount` decimal(10,2) DEFAULT NULL,
  `payment_start_month` date DEFAULT NULL,
  `number_of_months` int(11) DEFAULT NULL,
  `payment_end_month` date DEFAULT NULL,
  `pension_start_month` date DEFAULT NULL,
  `officer_name` varchar(200) DEFAULT NULL,
  `officer_designation` varchar(150) DEFAULT NULL,
  `officer_signature_path` varchar(500) DEFAULT NULL,
  `recommendation_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `social_security_entitlements`
--

CREATE TABLE `social_security_entitlements` (
  `id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `epf` tinyint(1) DEFAULT 0,
  `etf` tinyint(1) DEFAULT 0,
  `government_pension` tinyint(1) DEFAULT 0,
  `other_social_security` tinyint(1) DEFAULT 0,
  `other_details` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `role` enum('applicant','admin','sltda_officer','insurance_officer') DEFAULT 'applicant',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `role`, `status`, `created_at`) VALUES
(1, 'yasintharandika40@gmail.com', 'applicant', 'active', '2026-09-14 06:40:14');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applicant_profiles`
--
ALTER TABLE `applicant_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`);

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_no` (`application_no`),
  ADD KEY `fk_applications_user` (`user_id`),
  ADD KEY `fk_applications_scheme` (`scheme_id`);

--
-- Indexes for table `application_reviews`
--
ALTER TABLE `application_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `fk_review_application` (`application_id`);

--
--
-- Indexes for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_beneficiary_application` (`application_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_document_application` (`application_id`);

--
-- Indexes for table `employment_details`
--
ALTER TABLE `employment_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`);

--
-- Indexes for table `family_members`
--
ALTER TABLE `family_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_family_application` (`application_id`);

--
-- Indexes for table `memberships`
--
ALTER TABLE `memberships`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`),
  ADD UNIQUE KEY `membership_id` (`membership_id`),
  ADD UNIQUE KEY `certificate_no` (`certificate_no`);

--
--
-- Indexes for table `pension_schemes`
--
ALTER TABLE `pension_schemes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sltda_recommendations`
--
ALTER TABLE `sltda_recommendations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`),
  ADD KEY `fk_recommendation_officer` (`officer_id`);

--
-- Indexes for table `social_security_entitlements`
--
ALTER TABLE `social_security_entitlements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_id` (`application_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applicant_profiles`
--
ALTER TABLE `applicant_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `application_reviews`
--
ALTER TABLE `application_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
--
-- AUTO_INCREMENT for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employment_details`
--
ALTER TABLE `employment_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `family_members`
--
ALTER TABLE `family_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `memberships`
--
ALTER TABLE `memberships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
--
-- AUTO_INCREMENT for table `pension_schemes`
--
ALTER TABLE `pension_schemes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sltda_recommendations`
--
ALTER TABLE `sltda_recommendations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `social_security_entitlements`
--
ALTER TABLE `social_security_entitlements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applicant_profiles`
--
ALTER TABLE `applicant_profiles`
  ADD CONSTRAINT `applicant_profiles_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_profile_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_applications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_applications_scheme` FOREIGN KEY (`scheme_id`) REFERENCES `pension_schemes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Constraints for table `application_reviews`
--
ALTER TABLE `application_reviews`
  ADD CONSTRAINT `application_reviews_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`),
  ADD CONSTRAINT `application_reviews_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_review_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
--
-- Constraints for table `beneficiaries`
--
ALTER TABLE `beneficiaries`
  ADD CONSTRAINT `beneficiaries_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_beneficiary_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_document_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employment_details`
--
ALTER TABLE `employment_details`
  ADD CONSTRAINT `employment_details_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employment_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `family_members`
--
ALTER TABLE `family_members`
  ADD CONSTRAINT `family_members_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `memberships`
--
ALTER TABLE `memberships`
  ADD CONSTRAINT `fk_membership_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `memberships_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`);

--
--
-- Constraints for table `sltda_recommendations`
--
ALTER TABLE `sltda_recommendations`
  ADD CONSTRAINT `fk_recommendation_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recommendation_officer` FOREIGN KEY (`officer_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `sltda_recommendations_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sltda_recommendations_ibfk_2` FOREIGN KEY (`officer_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `social_security_entitlements`
--
ALTER TABLE `social_security_entitlements`
  ADD CONSTRAINT `fk_social_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `social_security_entitlements_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- --------------------------------------------------------
-- Additional supporting tables (additive; existing tables are unchanged)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `districts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `district_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `districts_name_unique` (`district_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `divisional_secretariats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `district_id` int(11) NOT NULL,
  `ds_name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `divisional_secretariats_district_name_unique` (`district_id`, `ds_name`),
  CONSTRAINT `fk_divisional_secretariats_district` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tourism_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tourism_categories_name_unique` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `employment_categories` (
  `employment_id` int(11) NOT NULL,
  `tourism_category_id` int(11) NOT NULL,
  `other_category_name` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`employment_id`, `tourism_category_id`),
  CONSTRAINT `fk_employment_categories_employment` FOREIGN KEY (`employment_id`) REFERENCES `employment_details` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_employment_categories_tourism_category` FOREIGN KEY (`tourism_category_id`) REFERENCES `tourism_categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `social_security_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `security_name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `social_security_types_name_unique` (`security_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `application_social_security` (
  `application_id` int(11) NOT NULL,
  `social_security_type_id` int(11) NOT NULL,
  `is_entitled` tinyint(1) NOT NULL DEFAULT 0,
  `remarks` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`application_id`, `social_security_type_id`),
  CONSTRAINT `fk_application_social_security_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_application_social_security_type` FOREIGN KEY (`social_security_type_id`) REFERENCES `social_security_types` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `application_status_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `application_id` int(11) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `remarks` varchar(1000) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `application_status_history_application_idx` (`application_id`),
  CONSTRAINT `fk_application_status_history_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_application_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sssb_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `application_id` int(11) NOT NULL,
  `reviewed_by` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `decision` enum('pending','recommended','approved','rejected','returned') NOT NULL DEFAULT 'pending',
  `remarks` varchar(1000) DEFAULT NULL,
  `recommendation_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sssb_recommendations_application_unique` (`application_id`),
  CONSTRAINT `fk_sssb_recommendations_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_sssb_recommendations_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_sssb_recommendations_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `tourism_categories` (`category_name`) VALUES
  ('Homestay'), ('Bungalow'), ('Tourist Hotels'), ('Rented Apartment'),
  ('Tourist Guide Lecturers'), ('Travel Agents'), ('Tourist Driver'), ('Other');

INSERT IGNORE INTO `social_security_types` (`security_name`) VALUES
  ('EPF'), ('ETF'), ('Government Pension'), ('Other Social Security Scheme');

-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS applicant_otp_challenges (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  email VARCHAR(150) NOT NULL,
  otp_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  used_at DATETIME DEFAULT NULL,
  invalidated_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY applicant_otp_user_created (user_id, created_at),
  KEY applicant_otp_email (email),
  UNIQUE KEY applicant_otp_user_unique (user_id),
  CONSTRAINT fk_applicant_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




-- --------------------------------------------------------
-- Officer details are attached to each review, preserving previous decisions.
CREATE TABLE IF NOT EXISTS review_officer_details (
  review_id INT NOT NULL PRIMARY KEY,
  recommending_officer_name VARCHAR(200) DEFAULT NULL,
  recommending_designation VARCHAR(200) DEFAULT NULL,
  approving_designation VARCHAR(200) DEFAULT NULL,
  signature_image MEDIUMTEXT DEFAULT NULL,
  CONSTRAINT review_officer_review_fk FOREIGN KEY (review_id) REFERENCES application_reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Consolidated schema: insurance officer role and account
-- SLTDA officers retain role 'admin'. Insurance company officers use 'insurance_officer'.
-- Keep the legacy enum value so existing records are not silently reassigned.
ALTER TABLE users
  MODIFY COLUMN role ENUM('applicant','admin','sltda_officer','insurance_officer') DEFAULT 'applicant';

INSERT INTO users (email, role, status)
VALUES ('yasintharandika32@gmail.com', 'insurance_officer', 'active')
ON DUPLICATE KEY UPDATE role = 'insurance_officer', status = 'active';

-- --------------------------------------------------------
-- Consolidated schema: applicant LRRS registrations
-- Authoritative registration belongs to an account, not editable application input.
CREATE TABLE IF NOT EXISTS applicant_lrrs_registrations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone_number VARCHAR(30) DEFAULT NULL,
  lrrs_registration_no VARCHAR(100) DEFAULT NULL,
  sltda_registration_no VARCHAR(100) DEFAULT NULL,
  verification_status ENUM('verified','not_verified','pending') NOT NULL DEFAULT 'pending',
  eligibility_status ENUM('eligible','not_eligible') NOT NULL DEFAULT 'not_eligible',
  expires_at DATE DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY applicant_lrrs_user_unique (user_id),
  CONSTRAINT applicant_lrrs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Testing-only registration for the existing local applicant; not an LRRS-verified record.
-- Keep this email in LRRS_TEST_EMAILS during testing so live lookup does not replace it.
INSERT INTO applicant_lrrs_registrations (user_id, sltda_registration_no)
SELECT id, 'T-2200' FROM users
WHERE email = 'yasintharandika40@gmail.com' AND role = 'applicant' AND status = 'active'
ON DUPLICATE KEY UPDATE sltda_registration_no = 'T-2200';

-- Consolidated schema: imported LRRS registrations
-- Surekuma MySQL: minimal registry exported from LRRS.
-- Multiple registrations per email are retained and require administrator review.
CREATE TABLE IF NOT EXISTS lrrs_imported_registrations (
  email VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  registration_no VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (email, registration_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The same member can have more than one application; avoid an upsert matching another application.
SET @registration_index_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'applicant_profiles' AND index_name = 'sltda_registration_no');
SET @registration_index_sql = IF(@registration_index_exists > 0,
  'ALTER TABLE applicant_profiles DROP INDEX sltda_registration_no', 'SELECT 1');
PREPARE registration_index_statement FROM @registration_index_sql;
EXECUTE registration_index_statement;
DEALLOCATE PREPARE registration_index_statement;

-- Queue in the same transaction as the review so SMTP outages never lose the email.
CREATE TABLE IF NOT EXISTS review_email_outbox (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  recipient VARCHAR(150) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status ENUM('pending','sending','sent') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY review_email_review_unique (review_id),
  KEY review_email_due (status, next_attempt_at),
  CONSTRAINT review_email_review_fk FOREIGN KEY (review_id) REFERENCES application_reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
