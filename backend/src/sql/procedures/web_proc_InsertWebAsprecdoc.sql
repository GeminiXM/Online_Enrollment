-- Stored procedure for inserting receipt document information
-- This procedure inserts records into the asprecdoc table for membership dues and add-on services
-- 
-- For monthly membership dues:
-- parCustCode = cust_code 
-- parDocNo = cust_code
-- parBillTo = cust_code
-- parAmt = dues price
-- parBillable = 'D'
-- parUpcCode = inventory upccode
-- parBeginDate = requested Start Date
-- parStmtText = inventory description of dues
-- parStore = club id
-- parEndDate = NULL
--
-- For monthly addons/services:
-- parCustCode = cust_code
-- parDocNo = 'ADDON'
-- parBillTo = cust_code
-- parAmt = monthly cost for the addon
-- parBillable = 'B'
-- parUpcCode = inventory upccode of the service/addon
-- parBeginDate = requested Start Date
-- parStmtText = inventory description of addon/service
-- parStore = club id
-- parEndDate = NULL

CREATE PROCEDURE web_proc_InsertWebAsprecdoc(
    parCustCode CHAR(10),
    parDocNo CHAR(20),
    parBillTo CHAR(10),
    parAmt DECIMAL(12,2),
    parBillable CHAR(1),
    parUpcCode CHAR(20),
    parBeginDate DATE,
    parStmtText CHAR(100),
    parStore CHAR(3),
    parEndDate DATE,
    parCreatedDate DATE
)

DEFINE v_create_date DATE;
DEFINE v_create_time CHAR(8);
DEFINE v_item_seq INT;

-- Get current date and time
LET v_create_date = TODAY;
LET v_create_time = CURRENT HOUR TO SECOND;

-- Find the next available item sequence for this customer and document
SELECT NVL(MAX(recd_item_seq), 0) + 1 INTO v_item_seq
FROM web_asprecdoc
WHERE recd_cust_code = parCustCode
  AND recd_doc_no = parDocNo;

-- Insert the record into web_asprecdoc table
INSERT INTO web_asprecdoc (
    recd_cust_code,
    recd_doc_no,
    recd_item_seq,
    recd_bill_to,
    recd_status,
    recd_amt,
    recd_ref_desc,
    recd_billable,
    recd_upc_code,
    recd_begin_date,
    recd_end_date,
    recd_stmt_text,
    recd_store,
    recd_create_date,
    recd_create_time,
    recd_create_user
) VALUES (
    parCustCode,
    parDocNo,
    v_item_seq,
    parBillTo,
    'A',                  -- Status 'Active'
    parAmt,
    CASE 
        WHEN parBillable = 'D' THEN 'MONTHLY DUES'
        WHEN parBillable = 'B' THEN 'ADDON SERVICE'
        ELSE ''
    END,
    parBillable,
    parUpcCode,
    parBeginDate,
    parEndDate,
    parStmtText,
    parStore,
    v_create_date,
    v_create_time,
    'ONLINE'
);

END PROCEDURE;

-- Procedure execution signature
execute procedure web_proc_InsertWebAsprecdoc(parCustCode,
            parDocNo,
            parBillTo,
            parAmt,
            parBillable,
            parUpcCode,
            parBeginDate,
            parStmtText,
            parStore,
            parEndDate,
            parCreatedDate
        );
