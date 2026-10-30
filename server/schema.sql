-- CertVerify schema (MySQL 8 / MariaDB 10.6+). Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('super_admin','issuer') NOT NULL DEFAULT 'issuer',
  title         VARCHAR(160) NOT NULL DEFAULT '',
  department    VARCHAR(160) NOT NULL DEFAULT '',
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certificates (
  id                    VARCHAR(40)  NOT NULL PRIMARY KEY,
  unique_number         CHAR(14)     NOT NULL,
  certificate_id        VARCHAR(60)  NOT NULL,
  status                ENUM('valid','expiring','revoked','draft') NOT NULL DEFAULT 'valid',

  trainee_title         VARCHAR(10)  NOT NULL DEFAULT 'Mr.',
  trainee_name          VARCHAR(160) NOT NULL,
  passport_number       VARCHAR(40)  NOT NULL DEFAULT 'N/A',

  course_title          VARCHAR(255) NOT NULL,
  stcw_regulation       VARCHAR(400) NOT NULL,
  approval_resolution   VARCHAR(160) NOT NULL,
  approval_authority    VARCHAR(255) NOT NULL,
  approval_date         DATE NOT NULL,
  approval_valid_until  DATE NOT NULL,

  training_start_date   DATE NOT NULL,
  training_end_date     DATE NOT NULL,
  training_mode         ENUM('Presential','Online','Blended') NOT NULL DEFAULT 'Presential',
  training_location      VARCHAR(190) NOT NULL,

  issue_date            DATE NOT NULL,
  expiry_date           DATE NOT NULL,
  validity_years        TINYINT UNSIGNED NOT NULL DEFAULT 5,
  signatory_name        VARCHAR(120) NOT NULL,
  signatory_title       VARCHAR(160) NOT NULL,

  revocation_reason     ENUM('issued_in_error','fraud','course_withdrawn','administrative_suspension','other') NULL,
  revocation_notes      TEXT NULL,
  revoked_at            DATETIME NULL,
  revoked_by            VARCHAR(160) NULL,

  scan_count            INT UNSIGNED NOT NULL DEFAULT 0,
  last_scanned_at       DATETIME NULL,
  created_by            VARCHAR(40) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_cert_unique_number (unique_number),
  UNIQUE KEY uq_cert_certificate_id (certificate_id),
  KEY idx_cert_status (status),
  KEY idx_cert_trainee (trainee_name),
  CONSTRAINT fk_cert_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The PDF/image file itself. Kept out of `certificates` so list queries never load blobs.
CREATE TABLE IF NOT EXISTS certificate_documents (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  certificate_id VARCHAR(40)  NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  size_bytes     INT UNSIGNED NOT NULL,
  sha256         CHAR(64)     NOT NULL,
  is_generated   TINYINT(1)   NOT NULL DEFAULT 0,
  data           LONGBLOB     NOT NULL,
  uploaded_by    VARCHAR(40)  NULL,
  uploaded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_certificate (certificate_id),
  CONSTRAINT fk_doc_certificate FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scan_logs (
  id                        VARCHAR(40)  NOT NULL PRIMARY KEY,
  certificate_unique_number VARCHAR(40)  NOT NULL,
  certificate_id            VARCHAR(60)  NOT NULL,
  trainee_name              VARCHAR(160) NOT NULL,
  scanned_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address                VARCHAR(64)  NOT NULL,
  location_city             VARCHAR(120) NOT NULL DEFAULT 'Unknown',
  location_country          VARCHAR(160) NOT NULL DEFAULT 'Unknown',
  device_type               VARCHAR(40)  NOT NULL,
  search_method             ENUM('qr_scan','number_lookup','name_search') NOT NULL,
  is_suspicious             TINYINT(1)   NOT NULL DEFAULT 0,
  suspicion_reason          VARCHAR(255) NULL,
  KEY idx_scan_time (scanned_at),
  KEY idx_scan_cert (certificate_unique_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS portal_settings (
  config_key   VARCHAR(60) NOT NULL PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
