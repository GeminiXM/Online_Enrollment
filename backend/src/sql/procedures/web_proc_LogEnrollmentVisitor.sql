-- Informix Stored Procedure: Upsert visitor/abandoned enrollment snapshot
-- Notes:
-- - Uses UPDATE-first, then INSERT if row doesn't exist.
-- - Timestamps are server-side (CURRENT) to avoid client clock skew.

DROP PROCEDURE IF EXISTS web_proc_LogEnrollmentVisitor;

CREATE PROCEDURE web_proc_LogEnrollmentVisitor(
  parVisitorId            VARCHAR(64),
  parSessionId            VARCHAR(80),
  parClubId               SMALLINT,
  parFirstName            VARCHAR(60),
  parLastName             VARCHAR(60),
  parEmail                VARCHAR(200),
  parPhone                VARCHAR(40),
  parRequestedStartDate   DATE,
  parLastPath             VARCHAR(255),
  parReferrer             VARCHAR(255),
  parIpAddress            VARCHAR(64),
  parUserAgent            LVARCHAR(1024)
)
  RETURNING INTEGER, INTEGER, INTEGER, LVARCHAR;

  DEFINE SqlStat      INTEGER;
  DEFINE SqlCodeError SMALLINT;
  DEFINE IsamError    SMALLINT;
  DEFINE ErrorMsg     CHAR(255);
  DEFINE result       INTEGER;
  DEFINE sql_error    INTEGER;
  DEFINE isam_error   INTEGER;
  DEFINE error_msg    LVARCHAR;

  LET SqlStat    = 0;
  LET result     = 0;
  LET sql_error  = 0;
  LET isam_error = 0;
  LET error_msg  = NULL;

  BEGIN
    ON EXCEPTION SET SqlCodeError, IsamError, ErrorMsg
      LET result     = -1 * SqlStat;
      LET sql_error  = SqlCodeError;
      LET isam_error = IsamError;
      LET error_msg  = 'SqlStat=' || SqlStat ||
                       ' sql_error=' || SqlCodeError ||
                       ' isam_error=' || IsamError ||
                       ' msg=' || NVL(ErrorMsg, '');
      RETURN result, sql_error, isam_error, error_msg;
    END EXCEPTION;

    LET SqlStat = 1;
    -- Update existing visitor record (don't overwrite with blanks)
    UPDATE web_enrollment_visitor_log
       SET last_seen_dt         = CURRENT,
           session_id           = NVL(parSessionId, session_id),
           club_id              = NVL(parClubId, club_id),
           first_name           = DECODE(parFirstName, NULL, first_name, '', first_name, parFirstName),
           last_name            = DECODE(parLastName, NULL, last_name, '', last_name, parLastName),
           email                = DECODE(parEmail, NULL, email, '', email, parEmail),
           phone                = DECODE(parPhone, NULL, phone, '', phone, parPhone),
           requested_start_date = NVL(parRequestedStartDate, requested_start_date),
           last_path            = DECODE(parLastPath, NULL, last_path, '', last_path, parLastPath),
           referrer             = DECODE(parReferrer, NULL, referrer, '', referrer, parReferrer),
           ip_address           = DECODE(parIpAddress, NULL, ip_address, '', ip_address, parIpAddress),
           user_agent           = DECODE(parUserAgent, NULL, user_agent, '', user_agent, parUserAgent)
     WHERE visitor_id = parVisitorId;

    LET SqlStat = 2;
    IF (DBINFO('sqlca.sqlerrd2') = 0) THEN
      -- Not found: insert new visitor record
      INSERT INTO web_enrollment_visitor_log (
        visitor_id,
        session_id,
        club_id,
        first_seen_dt,
        last_seen_dt,
        first_name,
        last_name,
        email,
        phone,
        requested_start_date,
        last_path,
        referrer,
        ip_address,
        user_agent
      ) VALUES (
        parVisitorId,
        parSessionId,
        parClubId,
        CURRENT,
        CURRENT,
        parFirstName,
        parLastName,
        parEmail,
        parPhone,
        parRequestedStartDate,
        parLastPath,
        parReferrer,
        parIpAddress,
        parUserAgent
      );
    END IF;

    RETURN result, sql_error, isam_error, error_msg;
  END;

END PROCEDURE;

GRANT EXECUTE ON PROCEDURE web_proc_LogEnrollmentVisitor TO 'public';

