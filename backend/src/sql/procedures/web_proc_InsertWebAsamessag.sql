-- Stored procedure for inserting message information
-- This procedure should be run after all other stored procedures when a member enrolls
-- Parameters:
-- parCustCode: The customer code (cust_code)
-- parMessageText: The message text in format 'Join: [requested start date] Net: [monthly dues only no additional services]'
-- parCreateDate: The creation date (should be the requested start date)
execute procedure web_proc_InsertWebAsamessag(parCustCode,
             parMessageText,
             parCreateDate
         );
