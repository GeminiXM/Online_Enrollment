--Existing SP: Get Dues
execute procedure procInventoryDuesPriceListSelect1 (parClubId, 
     parMembershipType, --(I)ndividual, (D)ual, (F)amily
     parAgreementType, --(M)onthly, (A)nnual
     parSpecialtyMembership, --"","J","S","Y"
     parBridgeCode --if there's a specialty membership
);
