-- Stored procedure for inserting gift certificate information
execute procedure web_proc_InsertWebAsigiftcert(parGiftCertId,
             parOrigTrans,
             parOrigBalance,
             parCurBalance,
             parPkgQty,
             parCardId,
             parCustCode,
             parDescription,
             parUpcCode
         );
)