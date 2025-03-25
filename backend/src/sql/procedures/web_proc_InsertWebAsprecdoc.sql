-- Stored procedure for inserting receipt document information
execute procedure web_proc_InsertWebAsprecdoc(parCustCode,
            parDocNo,
            parBillTo,
            parAmt,
            parBillable,
            parUpcCode,
            parBeginDate,
            parStmtText,
            parStore,
            parEndDate
        );
