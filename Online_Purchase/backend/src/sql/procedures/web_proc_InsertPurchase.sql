-- Existing SP: posts purchase (header, tender, item, optional gift cert) and returns result/rsTrans
execute procedure web_proc_InsertPurchase(parCustCode, parClub, parUPC, parQty, parPrice, parCC_Issuer, parCC_Exp, parCC_Masked, parSalesRepEmpCode, parCreateGiftCert, parDescription)

