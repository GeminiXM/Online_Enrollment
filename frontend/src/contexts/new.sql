drop procedure "informix".tmp_aging;

create procedure "informix".tmp_aging()

--Updated procedure to correctly run tmp Aging
--tmp_aging wasn't working because someone changed it - this is the full correct code
--Mark Moore & Brian Waterhouse
--4/15/2025

-- fixed locking and unecessary index building 5/22/2003 - blw

define ret_code           integer;
define LastAgingDate      date;
define NewAgingDate       date;
define LastDayOfPrevMonth date;
define CustCode           like strcustr.cust_code;
define Bucket120          like asaaging.bucket_120;
define Bucket90           like asaaging.bucket_90;
define Bucket60           like asaaging.bucket_60;
define Bucket30           like asaaging.bucket_30;
define PrevBalance        like asaaging.prev_stmt_bal;
define CurrentBal         like asaaging.current_bal;
define newCredits         like asaaging.current_bal;
define prevCredit         like asaaging.prev_credit;
define prevDebit          like asaaging.prev_debit;
define err_num            integer;
 
  ON EXCEPTION SET err_num
    rollback work;
    RAISE exception err_num;  -- pass the error up
  END EXCEPTION

  -- start a transaction
  begin work;

  -- remove previous temp aging
  delete from tmpaging;

  -- get system params for last aging date
  select last_aging_date into LastAgingDate from asaacctsys;

  -- set NewAgingDate to first of last month if run before the 19th
  let NewAgingDate = today;

  let LastDayOfPrevMonth = extend(extend(today, year to month), year to day);
  let LastDayOfPrevMonth = LastDayOfPrevMonth - 1 units day;

  -- First pass through the last months aging records
  select cust_code, bucket_120, bucket_90,
         bucket_60, bucket_30, current_bal
  from asaaging
  where aging_date = LastAgingDate
  into temp ThisAging;

  -- build index for future reference
  -- What is the point of this?
  --create unique index tmpaging_indx on ThisAging( cust_code );

  insert into ThisAging
  select  cust_code, 0 bucket_120, 0 bucket_90,
          0 bucket_60, 0 bucket_30, 0 current_bal
  from asardetail
  where aging_date is null
  and cust_code not in ( select cust_code from asaaging
                        where aging_date = LastAgingDate )
  group by 1;

  -- get the sum of debits and credits
  select cust_code, dbcr, sum(dollar) amt
  from asardetail
  where aging_date is null
  group by 1,2
  into temp tempDbcr;

  -- go through the aging records
  foreach agingrec with hold for
    select cust_code,
           bucket_120,
           bucket_90,
           bucket_60,
           bucket_30,
           current_bal
      into CustCode,
           Bucket120,
           Bucket90,
           Bucket60,
           Bucket30,
           CurrentBal
    from ThisAging

    -- move everything back one bucket
    let Bucket120 = Bucket120 + Bucket90;
    let Bucket90  = Bucket60;
    let Bucket60  = Bucket30;
    let Bucket30  = CurrentBal;

    -- get any new debits/charges
    select amt into CurrentBal
    from tempDbcr
    where cust_code = CustCode
      and dbcr = "D";
    let ret_code = dbinfo('sqlca.sqlerrd2');
    if ret_code <= 0 then
      let CurrentBal = 0.00;
    end if;

    let prevDebit = CurrentBal;

    -- get any new credits/payments
    select amt into newCredits
    from tempDbcr
    where cust_code = CustCode
      and dbcr = "C";
    let ret_code = dbinfo('sqlca.sqlerrd2');
    if ret_code <= 0 then
      let newCredits  = 0.00;
    end if;

    let newCredits = newCredits * -1;
    let prevCredit = newCredits;

    -- add buckets for previous balance
    let PrevBalance = Bucket120+Bucket90+Bucket60+Bucket30;

    -- check for any debits and/or new credits
    -- only process if they owe something
    if ((PrevBalance <> 0 ) or
        (CurrentBal   > 0 ) or
        (newCredits   < 0)) then

      -- process credits and debits
      if (Bucket120 <> 0 ) then
        let Bucket120 = Bucket120 + newCredits;
        if (Bucket120 < 0) then
          let newCredits = Bucket120;
          let Bucket120  = 0.00;
        else
          let newCredits = 0.00;
        end if;
      end if;  -- if Bucket120 has an amount

      if (Bucket90 <> 0 ) then
        let Bucket90 = Bucket90 + newCredits;
        if (Bucket90 < 0) then
          let newCredits = Bucket90;
          let Bucket90   = 0.00;
        else
          let newCredits = 0.00;
        end if;
      end if;  -- if Bucket90 has an amount

      if (Bucket60 <> 0 ) then
        let Bucket60 = Bucket60 + newCredits;
        if (Bucket60 < 0) then
          let newCredits = Bucket60;
          let Bucket60   = 0.00;
        else
          let newCredits = 0.00;
        end if;
      end if;  -- if Bucket60 has an amount

      if (Bucket30 <> 0 ) then
        let Bucket30 = Bucket30 + newCredits;
        if (Bucket30 < 0) then
          let newCredits = Bucket30;
          let Bucket30   = 0.00;
        else
          let newCredits = 0.00;
        end if;
      end if;  -- if Bucket30 has an amount

      -- add remaining credits to current debits
      let CurrentBal = CurrentBal + newCredits;

      insert into tmpaging ( cust_code, bucket_120, bucket_90, bucket_60,
                            bucket_30, current_bal, previous_bal,
                             aging_date)
                   values ( CustCode, Bucket120, Bucket90, Bucket60,
                            Bucket30, CurrentBal, PrevBalance,
                            NewAgingDate );

    end if;  -- if there are any debits and/or credits

  end foreach;

    -- update asaacctsys
    update asaacctsys
      set last_tmpaging   = NewAgingDate;

    -- end the transaction
    commit work;

    -- clean up temp tables
    drop table ThisAging;
    drop table tempDbcr;

end procedure;

grant execute on procedure 'informix'.tmp_aging() to 'public';
