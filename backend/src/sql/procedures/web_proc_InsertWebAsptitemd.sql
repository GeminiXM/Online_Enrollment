-- Stored procedure for inserting payment item details
execute procedure web_proc_InsertWebAsptitemd(parTitemdTrans,
             parTitemdUpcCode,
             parTitemdSize,
             parTitemdColor,
             parTitemdStyle,
             parTitemdQty,
             parTitemdOrigPrice,
             parTitemdModPrice,
             parTitemdSalePrice,
             parTitemdTaxable,
             parTitemdEvent,
             parTitemdExtPrice,
             parTitemdSalesperson,
             parTitemdCommPart,
             parTitemdTaxAmt,
             parTitemdCommAmt,
             parTitemdType,
             parTitemdReservation
);
