--Get the tax rate from BOSS but only for New Mexico clubs
--For all other clubs (Colorado/Denver) we should return 0
execute procedure web_proc_GetTaxRate()
