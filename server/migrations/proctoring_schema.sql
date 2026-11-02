-- ===================================================================
-- AI-Based Interview Proctoring & Malpractice Detection MySQL Schema
-- ===================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    experience_level VARCHAR(64) DEFAULT 'Freshers',
    streak INT DEFAULT 1,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    interview_type VARCHAR(128) NOT NULL,
    difficulty VARCHAR(32) NOT NULL,
    experience_level VARCHAR(64) NOT NULL,
    company VARCHAR(128) NOT NULL,
    role VARCHAR(128) DEFAULT NULL,
    status ENUM('active', 'completed', 'terminated_violation') NOT NULL DEFAULT 'active',
    termination_reason TEXT DEFAULT NULL,
    overall_score DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session_user (user_id),
    INDEX idx_session_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proctoring_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    max_warnings INT NOT NULL DEFAULT 3,
    no_face_threshold_sec DECIMAL(4,1) NOT NULL DEFAULT 4.0,
    gaze_away_threshold_sec DECIMAL(4,1) NOT NULL DEFAULT 3.5,
    device_confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.60,
    device_consecutive_detections INT NOT NULL DEFAULT 2,
    auto_terminate_on_critical BOOLEAN NOT NULL DEFAULT TRUE,
    penalty_no_face INT NOT NULL DEFAULT 10,
    penalty_multiple_faces INT NOT NULL DEFAULT 20,
    penalty_gaze_away INT NOT NULL DEFAULT 8,
    penalty_candidate_left INT NOT NULL DEFAULT 15,
    penalty_camera_interrupted INT NOT NULL DEFAULT 15,
    penalty_prohibited_device INT NOT NULL DEFAULT 25,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proctoring_events (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    event_type ENUM(
        'no_face',
        'multiple_faces',
        'gaze_away',
        'candidate_left',
        'camera_interrupted',
        'prohibited_device'
    ) NOT NULL,
    timestamp DATETIME NOT NULL,
    duration_seconds DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    details TEXT,
    device_type VARCHAR(64) DEFAULT NULL,
    is_false_positive BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by VARCHAR(64) DEFAULT NULL,
    reviewer_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proctoring_session (session_id),
    INDEX idx_proctoring_type (event_type),
    INDEX idx_proctoring_severity (severity),
    CONSTRAINT fk_proctoring_session
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS integrity_reports (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    monitoring_duration_sec INT NOT NULL,
    status ENUM('completed', 'terminated_violation') NOT NULL,
    termination_reason TEXT DEFAULT NULL,
    total_warnings INT NOT NULL DEFAULT 0,
    integrity_score INT NOT NULL,
    integrity_tier ENUM(
        'High',
        'Generally Consistent',
        'Requires Review',
        'Significant Concerns'
    ) NOT NULL,
    count_no_face INT NOT NULL DEFAULT 0,
    count_multiple_faces INT NOT NULL DEFAULT 0,
    count_gaze_away INT NOT NULL DEFAULT 0,
    count_prohibited_device INT NOT NULL DEFAULT 0,
    count_camera_interrupted INT NOT NULL DEFAULT 0,
    disclaimer TEXT NOT NULL,
    reviewed_by VARCHAR(64) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_integrity_user (user_id),
    INDEX idx_integrity_score (integrity_score),
    CONSTRAINT fk_integrity_session
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviewer_decisions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    reviewer_id VARCHAR(64) NOT NULL,
    action ENUM('mark_false_positive', 'restore_flag', 'add_note') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reviewer_session (session_id),
    INDEX idx_reviewer_event (event_id),
    CONSTRAINT fk_rev_event
        FOREIGN KEY (event_id) REFERENCES proctoring_events(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
