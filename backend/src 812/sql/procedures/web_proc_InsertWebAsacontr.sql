-- Stored procedure for inserting contract information
execute procedure web_proc_InsertWebAsacontr(parCustCode,
            parMbrshipType,
            parBeginDate,
            parGrossDues,
            parNetDues,
            parContractEffDate,
            parCreatedDate
        );
