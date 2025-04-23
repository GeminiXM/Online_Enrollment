--Returns 'CONVERGE' or 'FLUIDPAY'
--This will determine if running the stored procedure procConvergeItemSelect1 or procFluidpayItemSelect1
execute procedure web_proc_GetCCProcessor(parClub);