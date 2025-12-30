-- Informix Stored Procedure: log Online Purchase form data (PT purchases)
-- This is intended as best-effort logging; callers should NOT depend on it for purchase success.

DROP PROCEDURE IF EXISTS web_proc_LogOnlinePurchase;

CREATE PROCEDURE web_proc_LogOnlinePurchase(
  parClubId               INTEGER,
  parMembershipNo         VARCHAR(30),
  parMembershipName       VARCHAR(120),
  parPackageUPC           VARCHAR(30),
  parPackageDesc          VARCHAR(200),
  parPackagePrice         DECIMAL(14,2),
  parContactName          VARCHAR(120),
  parPreferredPhone       VARCHAR(40),
  parContactEmail         VARCHAR(200),
  parLookingToAchieve     LVARCHAR(1024),
  parPreferredTrainerName VARCHAR(120),
  parReceiptEmail         VARCHAR(200),
  parClubTransNo          INTEGER,
  parDatePurchased        DATETIME YEAR TO SECOND
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
    INSERT INTO web_online_purchase_form (
      club_id,
      membership_no,
      membership_name,
      package_upc,
      package_desc,
      package_price,
      contact_name,
      preferred_phone,
      contact_email,
      looking_to_achieve,
      preferred_trainer_name,
      receipt_email,
      club_trans_no,
      date_purchased
    )
    VALUES (
      parClubId,
      parMembershipNo,
      parMembershipName,
      parPackageUPC,
      parPackageDesc,
      parPackagePrice,
      DECODE(parContactName, NULL, NULL, UPPER(parContactName)),
      parPreferredPhone,
      parContactEmail,
      parLookingToAchieve,
      parPreferredTrainerName,
      parReceiptEmail,
      parClubTransNo,
      NVL(parDatePurchased, CURRENT)
    );

    RETURN result, sql_error, isam_error, error_msg;
  END;

END PROCEDURE;

GRANT EXECUTE ON PROCEDURE web_proc_LogOnlinePurchase TO 'public';

