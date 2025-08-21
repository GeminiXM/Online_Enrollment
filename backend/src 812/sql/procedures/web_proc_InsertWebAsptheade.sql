-- Stored procedure for inserting payment header information
execute procedure web_proc_InsertWebAsptheade(parTheadeTrans,
             parTheadeStore,
             parTheadeRegister,
             parTheadeLocation,
             parTheadeDate,
             parTheadeCashier,
             parTheadeName,
             parTheadeSalesperson,
             parTheadeCustCode,
             parTheadeSubTotal,
             parTheadeTaxTotal,
             parTheadeGrandTotal,
             parTheadePostedDate,
             parTheadeDrawertime
);
