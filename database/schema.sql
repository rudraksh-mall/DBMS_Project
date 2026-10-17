-- =============================================================================
-- CivicFix AI — MySQL schema (relational replacement for MongoDB/Mongoose)
-- Target: MySQL 8.0.16+ / 8.4 (InnoDB, utf8mb4). Verified on MySQL 8.4.11.
-- -----------------------------------------------------------------------------
-- Conventions
--   * All identifiers are BIGINT UNSIGNED AUTO_INCREMENT surrogate keys.
--     The application serializes the numeric id back as a string in the
--     existing "_id" API field so the frontend contract is unchanged.
--   * Timestamps are stored in UTC. The connection pool uses timezone "Z".
--     DATETIME(3) keeps millisecond precision that MongoDB Date provided.
--   * Spatial: ward boundaries are stored as GEOMETRY NOT NULL SRID 4326 and
--     are inserted/queried with ST_GeomFromGeoJSON (coordinates are lng,lat).
--   * This file is idempotent (CREATE TABLE IF NOT EXISTS) and safe to re-run.
--     It does NOT create or select the database and performs no seeding.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- wards — municipal wards with polygon boundaries used for geo-assignment.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wards (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)    NOT NULL,
  city        VARCHAR(120)    NOT NULL,
  boundary    GEOMETRY        NOT NULL SRID 4326,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_wards_city_name (city, name),
  KEY idx_wards_city (city),
  SPATIAL KEY idx_wards_boundary (boundary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Ward boundaries (SRID 4326 polygons)';

-- -----------------------------------------------------------------------------
-- users — citizens, authorities, admins.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120)    NOT NULL,
  email           VARCHAR(255)    NOT NULL,
  password        VARCHAR(255)    NOT NULL,
  role            ENUM('citizen','authority','admin') NOT NULL DEFAULT 'citizen',
  ward_id         BIGINT UNSIGNED NULL,
  phone           VARCHAR(32)     NULL,
  avatar          VARCHAR(1024)   NULL,
  otp_code        VARCHAR(12)     NULL,
  otp_expires_at  DATETIME(3)     NULL,
  is_verified     TINYINT(1)      NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  google_id       VARCHAR(255)    NULL,
  providers       JSON            NOT NULL DEFAULT (JSON_ARRAY('local')),
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_ward (ward_id),
  KEY idx_users_google_id (google_id),
  CONSTRAINT fk_users_ward FOREIGN KEY (ward_id) REFERENCES wards (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Application users (roles: citizen/authority/admin)';

-- -----------------------------------------------------------------------------
-- ward_admins — normalizes the former embedded Ward.admins[] array.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ward_admins (
  ward_id  BIGINT UNSIGNED NOT NULL,
  user_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (ward_id, user_id),
  KEY idx_ward_admins_user (user_id),
  CONSTRAINT fk_ward_admins_ward FOREIGN KEY (ward_id) REFERENCES wards (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ward_admins_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Ward administrators join table';

-- -----------------------------------------------------------------------------
-- complaints — civic issue reports.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reported_by          BIGINT UNSIGNED NOT NULL,
  description          TEXT            NOT NULL,
  image_url            VARCHAR(1024)   NOT NULL
                       DEFAULT 'https://via.placeholder.com/800x450?text=Evidence+Image+Pending',
  lat                  DECIMAL(9,6)    NOT NULL,
  lng                  DECIMAL(9,6)    NOT NULL,
  ward_id              BIGINT UNSIGNED NOT NULL,
  ai_category          ENUM('garbage','road','drainage','lighting','water','traffic','infrastructure','obstruction','other')
                       NOT NULL DEFAULT 'other',
  ai_severity          ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  ai_keywords          JSON            NOT NULL DEFAULT (JSON_ARRAY()),
  ai_confidence        DECIMAL(4,3)    NULL,
  ai_rejection_reason  TEXT            NULL,
  ai_status            ENUM('ai','fallback') NOT NULL DEFAULT 'ai',
  priority_score       INT             NOT NULL DEFAULT 0,
  upvote_count         INT UNSIGNED    NOT NULL DEFAULT 0,
  status               ENUM('submitted','acknowledged','in_progress','resolved')
                       NOT NULL DEFAULT 'submitted',
  authority_remarks    TEXT            NULL,
  after_fix_image_url  VARCHAR(1024)   NULL,
  resolved_at          DATETIME(3)     NULL,
  created_at           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                       ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_complaints_ward_status (ward_id, status),
  KEY idx_complaints_ward_priority (ward_id, priority_score),
  KEY idx_complaints_reported_by (reported_by),
  KEY idx_complaints_status_created (status, created_at),
  KEY idx_complaints_priority (priority_score),
  KEY idx_complaints_created (created_at),
  KEY idx_complaints_category (ai_category),
  CONSTRAINT chk_complaints_lat CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT chk_complaints_lng CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT chk_complaints_conf CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  CONSTRAINT fk_complaints_reporter FOREIGN KEY (reported_by) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_ward FOREIGN KEY (ward_id) REFERENCES wards (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Civic complaints with AI analysis and workflow status';

-- -----------------------------------------------------------------------------
-- votes — one vote per (complaint, user), enforced at the database level.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_votes_complaint_user (complaint_id, user_id),
  KEY idx_votes_user (user_id),
  CONSTRAINT fk_votes_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Community upvotes; unique per (complaint,user)';

-- -----------------------------------------------------------------------------
-- complaint_status_history — additive audit trail of status transitions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_status_history (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id  BIGINT UNSIGNED NOT NULL,
  status        ENUM('submitted','acknowledged','in_progress','resolved') NOT NULL,
  changed_by    BIGINT UNSIGNED NULL,
  remarks       TEXT            NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_history_complaint (complaint_id, created_at),
  KEY idx_history_changed_by (changed_by),
  CONSTRAINT fk_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Append-only complaint status transition history';

-- -----------------------------------------------------------------------------
-- refresh_tokens — per-device refresh sessions (replaces embedded array).
-- id is the public session id used in the "<id>.<secret>" token format.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)        NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL,
  device      VARCHAR(512)    NULL,
  ip          VARCHAR(64)     NULL,
  expires_at  DATETIME(3)     NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_refresh_tokens_user (user_id),
  KEY idx_refresh_tokens_expires (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Hashed refresh-token sessions (multi-device)';