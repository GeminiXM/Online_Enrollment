-- Existing SP: promotes a restricted guest from web_* staging tables into
-- production membership tables and then posts the PT purchase via
-- web_proc_InsertPurchase, returning result/rsTrans.
execute procedure web_proc_InsertPurchaseRestricted(
  parCustCode,
  parClub,
  parUPC,
  parQty,
  parPrice,
  parCC_Issuer,
  parCC_Exp,
  parCC_Masked,
  parSalesRepEmpCode,
  parCreateGiftCert,
  parDescription,
  parApproval_Code,
  parGUID
);


