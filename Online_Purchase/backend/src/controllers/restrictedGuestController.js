"use strict";

import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import {
  processConvergeSale,
  processFluidPaySale,
} from "../services/paymentService.js";
import emailService from "../services/emailService.js";

// --- Helpers (mirroring onlineBuyController) ---
function toFourCharIssuer(brand) {
  if (!brand) return "";
  const b = String(brand).toUpperCase();
  if (b.startsWith("VIS")) return "VISA";
  if (b.startsWith("AMEX") || b.startsWith("AMX")) return "AMEX";
  if (b.startsWith("MAS") || b === "MC" || b.startsWith("MSTR")) return "MC";
  if (b.startsWith("DIS")) return "DISC";
  return b.slice(0, 4);
}

function mmYYToDate(mmYY) {
  if (!mmYY) return null;
  const s = String(mmYY).replace(/\s+/g, "").replace("/", "");
  if (s.length !== 4) return null;
  const mm = s.slice(0, 2);
  const yy = s.slice(2, 4);
  const month = parseInt(mm, 10);
  if (!month || month < 1 || month > 12) return null;
  const year = 2000 + parseInt(yy, 10);
  const m = String(month).padStart(2, "0");
  return `${m}/01/${year}`;
}

function todayMMDDYYYY() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function buildBusName(guest) {
  const first = (guest.firstName || "").toString().trim().toUpperCase();
  const last = (guest.lastName || "").toString().trim().toUpperCase();
  const middleRaw = (guest.middleInitial || "").toString().trim().toUpperCase();
  const middle = middleRaw ? `${middleRaw}. ` : "";
  return `${first} ${middle}${last}`.trim();
}

function pickPrimaryPhone(guest) {
  return (
    (guest.mobilePhone || guest.cellPhone || "").toString().trim() ||
    (guest.homePhone || "").toString().trim() ||
    (guest.workPhone || "").toString().trim() ||
    ""
  );
}

// --- Main controller ---
export async function restrictedGuestPurchase(req, res) {
  try {
    const {
      clubId,
      guest = {},
      ptPackage,
      payment,
      contact = {},
    } = req.body || {};

    if (!clubId) {
      return res
        .status(400)
        .json({ success: false, message: "clubId is required" });
    }

    const clubIdStr = String(clubId);
    const isTestClub = clubIdStr === "255";

    // For production clubs, enforce basic guest identity requirements.
    // For the TEST club (255), allow the request to proceed even if the
    // payload is missing these fields so QA can exercise the full flow.
    if (
      !isTestClub &&
      (!guest || !guest.firstName || !guest.lastName || !guest.email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Guest firstName, lastName, and email are required",
      });
    }

    if (!ptPackage || ptPackage.price == null || !ptPackage.invtr_upccode) {
      return res.status(400).json({
        success: false,
        message: "PT package (price and invtr_upccode) is required",
      });
    }

    if (!payment || !payment.processor) {
      return res.status(400).json({
        success: false,
        message: "Payment details are required",
      });
    }

    const state = pool.getStateForClub(clubId);
    const isColorado = state === "CO";
    const isNewMexico = state === "NM";

    if (!isColorado && !isNewMexico) {
      return res.status(400).json({
        success: false,
        message: "Unsupported club/state configuration",
      });
    }

    const clubIdNum = parseInt(clubId, 10);
    if (!Number.isFinite(clubIdNum)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid clubId" });
    }

    // 1) Generate a new restricted guest cust_code
    let custCode = null;
    try {
      const nextIdRows = await pool.query(
        clubIdNum,
        "EXECUTE PROCEDURE procNextMembershipId()",
        []
      );
      if (Array.isArray(nextIdRows) && nextIdRows.length > 0) {
        const firstRow = nextIdRows[0];
        const values = Object.values(firstRow);
        if (values.length > 0 && values[0] != null) {
          custCode = String(values[0]).trim();
        }
      }
    } catch (e) {
      logger.error("restrictedGuestPurchase: procNextMembershipId error", {
        clubId,
        error: e.message,
      });
    }

    if (!custCode) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to generate membership number for restricted guest. Please contact your club.",
      });
    }

    const busName = buildBusName(guest);
    const primaryPhone = pickPrimaryPhone(guest);
    const obtainedDate = todayMMDDYYYY();

    // 2) Insert restricted membership staging row via web_proc_InsertWebStrcustrRestricted
    try {
      await pool.query(
        clubIdNum,
        // 25 parameters, matching stored procedure signature
        "EXECUTE PROCEDURE web_proc_InsertWebStrcustrRestricted(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          custCode, // parCustCode
          custCode, // parBridgeCode (bridge to itself for restricted guests)
          busName, // parBusName
          "", // parCreditRep
          primaryPhone, // parPhone
          (guest.address1 || "").toString().trim(), // parAddress1
          (guest.address2 || "").toString().trim(), // parAddress2
          (guest.city || "").toString().trim(), // parCity
          (guest.state || "").toString().trim(), // parState
          (guest.zipCode || "").toString().trim(), // parPostCode
          obtainedDate, // parObtainedDate (MM/DD/YYYY)
          null, // parCcExpDate (not used for CASH restricted)
          "", // parCardNo
          "", // parExpDate
          busName.substring(0, 20), // parCardHolder (required, but unused for CASH)
          "", // parCcMethod
          "ONLINE", // parCreatedBy
          "ONLINE", // parSalesPersnCode
          (guest.email || "").toString().trim(), // parEmail
          clubIdNum, // parClub
          0, // parOrigPosTrans
          "", // parPin
          "", // parToken
          (guest.specialtyMembership || "").toString().trim(), // parSpecialtyMembership
          "Y", // parNewPt - they are buying the online special
        ]
      );
    } catch (e) {
      logger.error(
        "restrictedGuestPurchase: web_proc_InsertWebStrcustrRestricted error",
        {
          clubId,
          custCode,
          error: e.message,
        }
      );
      return res.status(500).json({
        success: false,
        message:
          "Unable to create restricted guest membership. Please contact your club.",
      });
    }

    // 3) Insert the single member row via web_proc_InsertWebAsamembr
    try {
      await pool.query(
        clubIdNum,
        "EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          custCode, // parCustCode
          0, // parMbrCode (primary)
          (guest.firstName || "").toString().trim().toUpperCase(), // parFname
          (guest.middleInitial || "").toString().trim().toUpperCase(), // parMname
          (guest.lastName || "").toString().trim().toUpperCase(), // parLname
          (guest.gender || "").toString().trim(), // parSex
          (guest.dateOfBirth || "").toString().trim(), // parBdate
          (guest.homePhone || "").toString().trim(), // parHomePhone
          (guest.workPhone || "").toString().trim(), // parWorkPhone
          "", // parWorkExtension
          (guest.mobilePhone || guest.cellPhone || "")
            .toString()
            .trim(), // parMobilePhone
          (guest.email || "").toString().trim(), // parEmail
          "P", // parRole
          new Date().toLocaleDateString("en-CA", {
            timeZone: "America/Denver",
          }), // parCreatedDate (YYYY-MM-DD)
          1, // parCard_Num
        ]
      );
    } catch (e) {
      logger.error("restrictedGuestPurchase: web_proc_InsertWebAsamembr error", {
        clubId,
        custCode,
        error: e.message,
      });
      return res.status(500).json({
        success: false,
        message:
          "Unable to create restricted guest member record. Please contact your club.",
      });
    }

    // 4) Process payment (FluidPay for CO, Converge for NM)
    const amount = Number(ptPackage.price);
    const customerData = {
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      email: guest.email || "",
      address: guest.address1 || "",
      city: guest.city || "",
      state: guest.state || "",
      zipCode: guest.zipCode || "",
      phone: primaryPhone || "",
    };

    let saleResult;
    if (isColorado) {
      if (!payment.token) {
        return res.status(400).json({
          success: false,
          message: "FluidPay token is required",
        });
      }
      saleResult = await processFluidPaySale(
        clubIdNum,
        amount,
        payment.token,
        customerData
      );
      saleResult.processorName = "FLUIDPAY";
    } else if (isNewMexico) {
      if (payment?.alreadyProcessed && payment?.transactionId) {
        const rawMsg = (payment.message || "").toString();
        const msgLower = rawMsg.toLowerCase();
        const hasApprovalCode =
          typeof payment.approvalCode === "string" &&
          payment.approvalCode.trim().length > 0;
        const looksApproved =
          hasApprovalCode ||
          msgLower.includes("approved") ||
          msgLower.includes("approval");

        saleResult = {
          success: !!looksApproved,
          transactionId: payment.transactionId,
          approvalCode: payment.approvalCode || "",
          message: payment.message || "",
          processorName: "CONVERGE",
        };
      } else {
        saleResult = await processConvergeSale(
          clubIdNum,
          amount,
          payment,
          customerData
        );
        saleResult.processorName = "CONVERGE";
      }
    }

    if (!saleResult?.success) {
      return res.status(400).json({
        success: false,
        message: saleResult?.message || "Payment failed",
      });
    }

    // 5) Post sale to POS via web_proc_InsertPurchase + header via web_proc_InsertPurchaseAspTHeade
    const cardBrand =
      payment?.cardBrand || payment?.brand || saleResult?.cardBrand || "";
    const maskedCard =
      payment?.cardMasked || payment?.masked || saleResult?.masked || "";
    const expMMYY =
      payment?.expDateMMYY || payment?.exp || saleResult?.expDateMMYY || "";

    const issuer4 = toFourCharIssuer(cardBrand);
    const expDate = mmYYToDate(expMMYY) || null;
    const qty = 1;
    const salesRep =
      parseInt(process.env.ONLINE_SALES_REP_CODE || "1109779", 10) || 1109779;
    const createGiftCert = "Y";
    const description =
      ptPackage?.description || "New Intro Personal Training Package";

    if (!ptPackage?.invtr_upccode) {
      return res.status(400).json({
        success: false,
        message: "PT package UPC is required for posting to POS",
      });
    }
    if (!issuer4 || !maskedCard || !expDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing card details (brand, masked number, or expiration) for POS tender posting",
      });
    }

    let dbTransactionId = null;
    try {
      logger.info("restrictedGuestPurchase: web_proc_InsertPurchase request", {
        clubId: clubIdNum,
        custCode,
        upc: ptPackage.invtr_upccode,
        qty,
        price: Number(ptPackage.price || amount || 0).toFixed(3),
        issuer4,
        expDate,
        maskedCard,
        salesRep,
        createGiftCert,
        description,
        approvalCode: saleResult?.approvalCode || null,
        guid: saleResult?.transactionId || null,
      });

      const rows = await pool.query(
        clubIdNum,
        "EXECUTE PROCEDURE web_proc_InsertPurchase(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          custCode, // parCustCode
          clubIdNum, // parClub
          ptPackage.invtr_upccode, // parUPC
          qty, // parQty
          Number(ptPackage.price || amount || 0).toFixed(3), // parPrice
          issuer4, // parCC_Issuer
          expDate, // parCC_Exp
          maskedCard, // parCC_Masked
          salesRep, // parSalesRepEmpCode
          createGiftCert, // parCreateGiftCert
          description, // parDescription
          saleResult?.approvalCode || null, // parApproval_Code
          saleResult?.transactionId || null, // parGUID
        ]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        const values = Object.values(r);
        const rsTrans = values.length ? Number(values[values.length - 1]) : null;
        const resultCode = Number(values[0] ?? 0);

        logger.info("restrictedGuestPurchase: web_proc_InsertPurchase response", {
          rawRow: r,
          values,
          resultCode,
          rsTrans,
        });

        if (!rsTrans || resultCode !== 0) {
          const errMsg =
            (values.length > 3 && values[3] && String(values[3]).trim()) ||
            "Purchase posting failed (transaction not created)";
          logger.error(
            "restrictedGuestPurchase: web_proc_InsertPurchase indicated failure",
            {
              resultCode,
              rsTrans,
              rawRow: r,
            }
          );
          return res.status(500).json({
            success: false,
            message: errMsg,
            details: { resultCode, rsTrans },
          });
        }

        dbTransactionId = rsTrans;
      } else {
        logger.error(
          "restrictedGuestPurchase: web_proc_InsertPurchase returned no rows"
        );
        return res.status(500).json({
          success: false,
          message:
            "No result returned from web_proc_InsertPurchase; transaction not created",
        });
      }
    } catch (dbErr) {
      logger.error("restrictedGuestPurchase: web_proc_InsertPurchase error", {
        error: dbErr.message,
        stack: dbErr.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Database error while posting purchase",
        error: dbErr.message,
      });
    }

    // 5b) Insert header row via web_proc_InsertPurchaseAspTHeade for reporting
    try {
      logger.info(
        "restrictedGuestPurchase: web_proc_InsertPurchaseAspTHeade request",
        {
          clubId: clubIdNum,
          custCode,
          upc: ptPackage.invtr_upccode,
          salesRep,
          totalProrateBilled: Number(ptPackage.price || amount || 0).toFixed(2),
        }
      );
      await pool.query(
        clubIdNum,
        "EXECUTE PROCEDURE web_proc_InsertPurchaseAspTHeade(?, ?, ?, ?, ?, ?, ?)",
        [
          custCode, // parCustCode
          ptPackage.invtr_upccode, // parUPC
          salesRep, // parSalesRepEmpCode
          0, // parProrateDuesAddon
          0, // parProrateDuesAddonTax
          Number(ptPackage.price || amount || 0).toFixed(2), // parTotalProrateBilled
          clubIdNum, // parClub
        ]
      );
    } catch (e) {
      logger.warn(
        "restrictedGuestPurchase: web_proc_InsertPurchaseAspTHeade error (non-blocking)",
        {
          clubId,
          custCode,
          error: e.message,
        }
      );
    }

    // 6) Send receipt + internal notifications (reuse Online_Purchase behavior)
    const CLUB_ID_TO_NAME = {
      "201": "Highpoint Sports & Wellness",
      "202": "Midtown Sports & Wellness",
      "203": "Downtown Sports & Wellness",
      "204": "Del Norte Sports & Wellness",
      "205": "Riverpoint Sports & Wellness",
      "252": "Colorado Athletic Club - DTC",
      "254": "Colorado Athletic Club - Tabor Center",
      "255": "TEST Club",
      "257": "Colorado Athletic Club - Flatirons",
      "292": "Colorado Athletic Club - Monaco",
    };
    const clubDisplayName = CLUB_ID_TO_NAME[clubIdStr] || `Club ${clubIdStr}`;

    const memberForEmail = {
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      membershipNumber: custCode,
      membershipName: busName,
    };

    const receiptPromise = emailService
      .sendPTPurchaseReceipt(
        {
          firstName: memberForEmail.firstName,
          lastName: memberForEmail.lastName,
          email: memberForEmail.email,
          membershipNumber: memberForEmail.membershipNumber,
          membershipName: memberForEmail.membershipName,
        },
        ptPackage,
        {
          processorName: saleResult.processorName,
          transactionId: saleResult.transactionId,
          amount,
          dbTransactionId,
        },
        {
          id: clubIdNum,
          name: clubDisplayName,
          state,
          email: process.env.DEFAULT_CLUB_EMAIL || "",
        }
      )
      .then((ok) => {
        if (ok === false) {
          const subj = `Alert: Restricted guest PT receipt failed - ${clubDisplayName} - #${custCode}`;
          const html = `
            <div>
              <div><strong>Membership #:</strong> ${custCode}</div>
              <div><strong>Membership Name:</strong> ${busName}</div>
              <div><strong>Club:</strong> ${clubDisplayName}</div>
              <div><strong>Club Transaction #:</strong> ${dbTransactionId || ""}</div>
              <div style="margin-top:8px;">Restricted guest PT receipt email failed to send (non-blocking). Please review logs for details.</div>
            </div>
          `;
          emailService.sendOpsAlert("mmoore@wellbridge.com", subj, html).catch(() => {});
        }
        return ok;
      })
      .catch((e) => {
        logger.warn("Restricted guest PT receipt email send failed (non-blocking)", {
          error: e?.message,
        });
        const subj = `Alert: Restricted guest PT receipt exception - ${clubDisplayName} - #${custCode}`;
        const html = `
          <div>
            <div><strong>Membership #:</strong> ${custCode}</div>
            <div><strong>Membership Name:</strong> ${busName}</div>
            <div><strong>Club:</strong> ${clubDisplayName}</div>
            <div><strong>Club Transaction #:</strong> ${dbTransactionId || ""}</div>
            <div style="margin-top:8px;"><strong>Error:</strong> ${e?.message || "Unknown error"}</div>
          </div>
        `;
        emailService.sendOpsAlert("mmoore@wellbridge.com", subj, html).catch(() => {});
        return false;
      });

    // Internal notifications to GM/PTM/Regional
    try {
      const clubIdToGm = {
        "201": "nhpgm@wellbridge.com",
        "202": "nmtgm@wellbridge.com",
        "203": "ndtgm@wellbridge.com",
        "204": "ndngm@wellbridge.com",
        "205": "nrpgm@wellbridge.com",
        "252": "cdcgm@wellbridge.com",
        "254": "ctbgm@wellbridge.com",
        "257": "cfigm@wellbridge.com",
        "292": "cmogm@wellbridge.com",
      };
      const gmEmail = clubIdToGm[clubIdStr] || "";
      const derivePtm = (gm) => {
        if (!gm || !gm.includes("@")) return "";
        const [local, domain] = gm.split("@");
        return `${local.replace(/gm$/i, "ptm")}@${domain}`;
      };
      const ptmEmail = derivePtm(gmEmail);
      const regionalEmail =
        state === "CO"
          ? "cacregptm@wellbridge.com"
          : state === "NM"
          ? "nmswregptm@wellbridge.com"
          : "";
      const recipients = [gmEmail, ptmEmail, regionalEmail]
        .filter(Boolean)
        .join(", ");
      if (recipients) {
        await emailService.sendPTInternal(
          recipients,
          {
            membershipNumber: custCode,
            membershipName: busName,
          },
          { description: ptPackage.description, price: ptPackage.price },
          { id: clubIdNum, name: clubDisplayName, state },
          memberForEmail.email || "",
          dbTransactionId || "",
          {
            name: (contact?.name || "").toString().trim(),
            phone: (contact?.phone || "").toString().trim(),
            email: (contact?.email || "").toString().trim(),
            goals: (contact?.goals || "").toString().trim(),
            preferredTrainer: (contact?.preferredTrainer || "").toString().trim(),
          }
        );
      }
    } catch (e) {
      logger.warn(
        "Restricted guest PT internal notification send failed (non-blocking)",
        { error: e.message }
      );
    }

    // Derive last4 for client receipt display
    const last4 =
      (
        /\d{4}$/.exec(
          (
            payment?.cardMasked ||
            payment?.masked ||
            saleResult?.masked ||
            ""
          ).toString()
        ) || [""]
      )[0];

    await receiptPromise.catch(() => {});

    return res.json({
      success: true,
      membershipNumber: custCode,
      processor: saleResult.processorName,
      transactionId: saleResult.transactionId,
      dbTransactionId,
      last4,
    });
  } catch (error) {
    logger.error("restrictedGuestPurchase error", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ success: false, message: "Server error during restricted guest purchase" });
  }
}


