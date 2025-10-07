-- Stored procedure for inserting member information
execute procedure web_proc_InsertWebAsamembr(parCustCode,
             parMbrCode,
             parFname,
             parMname,
             parLname,
             parSex,
             parBdate,
             parHomePhone,
             parWorkPhone,
             parWorkExtension,
             parMobilePhone,
             parEmail,
             parRole,
             parCreatedDate,
             parCard_Num
         );
)