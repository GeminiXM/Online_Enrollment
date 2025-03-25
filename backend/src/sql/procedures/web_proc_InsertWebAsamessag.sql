-- Stored procedure for inserting message information
execute procedure web_proc_InsertWebAsamessag(parCustCode,
             parMessageText,
             parMessageType,
             parExpireDate,
             parLocationCode,
             parCreateDate,
             parEmpCode,
             parTarget,
             parTickleDate,
             parDuration,
             parImageIndx
         );
)