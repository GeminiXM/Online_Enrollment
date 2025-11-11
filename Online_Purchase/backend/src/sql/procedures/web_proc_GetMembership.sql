CREATE PROCEDURE web_proc_GetMembership (parMembershipNbr CHAR(10))

/*
 Procedure: web_proc_GetMembership
 Name: Get Membership information for the given cust_code
 Author: Mark Moore
 Created: 11/11/2025
 Modified: 
 Version: 1.0
 Description:
   - Returns exactly one row for the supplied cust_code.
   - Named columns via RETURNING ... AS <name>.
   - Trims CHAR fields, uppercases cc_method, formats cc_exp_date (DATE) as MM/DD/YY.
   - Raises an exception if no row found.
 Example:
   EXECUTE PROCEDURE web_proc_GetMembership('083376');
*/
  RETURNING
    SMALLINT       AS club,
    CHAR(10)       AS membership_number,
    VARCHAR(30)    AS membership_name,
    CHAR(1)        AS status,
    VARCHAR(30)    AS address1,
    VARCHAR(30)    AS address2,
    VARCHAR(20)    AS city,
    VARCHAR(10)    AS state,
    VARCHAR(10)    AS zip_code,
    VARCHAR(6)     AS cc_type,
    VARCHAR(20)    AS card_no,
    CHAR(8)        AS cc_exp_date,    -- MM/DD/YY
    VARCHAR(25)    AS token;

    DEFINE rs_club         SMALLINT;
    DEFINE rs_cust_code    CHAR(10);
    DEFINE rs_bus_name     VARCHAR(30);
    DEFINE rs_status       CHAR(1);
    DEFINE rs_address1     VARCHAR(30);
    DEFINE rs_address2     VARCHAR(30);
    DEFINE rs_city         VARCHAR(20);
    DEFINE rs_state        VARCHAR(10);
    DEFINE rs_post_code    VARCHAR(10);
    DEFINE rs_cc_method    VARCHAR(6);
    DEFINE rs_card_no      VARCHAR(20);
    DEFINE rs_cc_exp_char  CHAR(8);
    DEFINE rs_token        VARCHAR(25);

    -- Single-row SELECT INTO (will error if >1 row matches)
    SELECT
        club,
        TRIM(CAST(cust_code   AS LVARCHAR)),
        TRIM(CAST(bus_name    AS LVARCHAR)),
        TRIM(CAST(status      AS LVARCHAR)),
        TRIM(CAST(address1    AS LVARCHAR)),
        TRIM(CAST(address2    AS LVARCHAR)),
        TRIM(CAST(city        AS LVARCHAR)),
        TRIM(CAST(state       AS LVARCHAR)),
        TRIM(CAST(post_code   AS LVARCHAR)),
        TRIM(CAST(UPPER(cc_method) AS LVARCHAR)),
        TRIM(CAST(card_no     AS LVARCHAR)),
        TO_CHAR(cc_exp_date, '%m/%d/%y'),
        TRIM(CAST(token       AS LVARCHAR))
    INTO
        rs_club,
        rs_cust_code,
        rs_bus_name,
        rs_status,
        rs_address1,
        rs_address2,
        rs_city,
        rs_state,
        rs_post_code,
        rs_cc_method,
        rs_card_no,
        rs_cc_exp_char,
        rs_token
    FROM strcustr
    WHERE cust_code = parMembershipNbr;

    -- No row found? SELECT INTO sets SQLCODE = 100
    IF (SQLCODE = 100) THEN
        RAISE EXCEPTION -746, 0,
          'web_proc_GetMembership: No membership found for cust_code [' || TRIM(parMembershipNbr) || ']';
    END IF;

    RETURN
        rs_club,          -- club
        rs_cust_code,     -- membership_number
        rs_bus_name,      -- membership_name
        rs_status,        -- status
        rs_address1,      -- address1
        rs_address2,      -- address2
        rs_city,          -- city
        rs_state,         -- state
        rs_post_code,     -- zip_code
        rs_cc_method,     -- cc_type
        rs_card_no,       -- card_no
        rs_cc_exp_char,   -- cc_exp_date
        rs_token;         -- token
END PROCEDURE;


