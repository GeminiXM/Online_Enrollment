-- Online Purchase: Get Online Specials for a Club
-- Usage:
--   execute procedure web_proc_GetOnlineSpecials(parClubId);
-- Returns rows: upccode (CHAR(15)), description (LVARCHAR), price (DECIMAL(10,2)), tax_code (CHAR(4))
execute procedure web_proc_GetOnlineSpecials(parClubId)


