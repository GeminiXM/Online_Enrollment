-- Informix DDL: visitor/abandoned-enrollment logging table
-- Purpose: capture partial lead info (if entered) + visit timestamps, even when enrollment is not completed.

DROP TABLE IF EXISTS web_enrollment_visitor_log;

CREATE TABLE web_enrollment_visitor_log (
  visitor_id           VARCHAR(64) NOT NULL,
  session_id           VARCHAR(80),
  club_id              SMALLINT,

  first_seen_dt        DATETIME YEAR TO SECOND,
  last_seen_dt         DATETIME YEAR TO SECOND,

  first_name           VARCHAR(60),
  last_name            VARCHAR(60),
  email                VARCHAR(200),
  phone                VARCHAR(40),
  requested_start_date DATE,

  last_path            VARCHAR(255),
  referrer             VARCHAR(255),
  ip_address           VARCHAR(64),
  user_agent           LVARCHAR(1024),

  PRIMARY KEY (visitor_id)
);

-- Optional (depending on Informix version/config):
-- CREATE INDEX web_enroll_vis_email_idx ON web_enrollment_visitor_log (email);
-- CREATE INDEX web_enroll_vis_phone_idx ON web_enrollment_visitor_log (phone);

