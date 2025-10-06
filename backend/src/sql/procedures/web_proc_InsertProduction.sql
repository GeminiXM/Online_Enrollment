-- This procedure migrates a new membership record from staging (web_*) tables into production tables in Informix. 
-- It performs the following steps:

-- 1. Checks if the given cust_code already exists in production.
--    - If it does, a new cust_code is generated and all related staging records are updated accordingly.
-- 2. Inserts records into the following production tables:
--    - strcustr (customer)
--    - asamembr (members)
--    - asamessag (notes/messages)
--    - asprecdoc (recurring billing documents)
--    - asacontr (contracts)
-- 3. Creates transaction header and tender records via:
--    - web_proc_InsertAspTHeade
--    - web_proc_InsertAspttendd
--    ---- web_proc_InsertAspTitemd will be run outside of this procedure immediately after, because it needs multiple upc codes & prices
-- 4. Inserts a contract point-of-sale record into asacontrpos.
-- 5. Returns:
--    - result code, SQL error, ISAM error, error message
--    - updated cust_code and generated transaction number

-- This procedure ensures atomicity via `BEGIN WORK` and `COMMIT`, with rollback on any exception.
-- result: 0 = success; negative = error
-- sql_error: SQL error code
-- isam_error: ISAM error code
-- error_msg: Text message if any failure occurs
-- rsUpdatedCustCode: Final customer code used
-- rsTrans: Transaction ID created

execute procedure web_proc_InsertProduction (parCustCode, 
	parStartDate, 
	parCreatedDate,
	parPrice, 
	parTax, 
	parClub, 
	parCC_Issuer, 
	parCC_Exp, 
	parCC,
	parCardHolder,
	--asacontrpos
	parProrateDues,
	parProrateDuesTax,
	parProrateAddonsTotal,
	parProrateAddonsTax,
	parProrateDuesAddon,
	parProrateDuesAddonTax,
	parIfee,
	parIfeeTax,
	parTotalProrateBilled,
	parOrigDues,
	parAddonsTax,
	parAddonsTotal,
	parDuesTax,
	parGrossMonthlyTotal,
	parNewPT,
	parPTUpc,
	parSalesRepEmpCode)