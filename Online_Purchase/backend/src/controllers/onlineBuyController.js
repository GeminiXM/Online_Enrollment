"use strict";

import axios from "axios";
import qs from "qs";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import {
  processConvergeSale,
  processFluidPaySale,
} from "../services/paymentService.js";
import emailService from "../services/emailService.js";
import dns from "dns/promises";

function isEmailFormatValid(email) {
  const e = String(email || "").trim();
  if (!e) return false;
  // Lightweight format check
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/i;
  return re.test(e);
}

async function resolveMxWithTimeout(domain, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // dns.promises doesn't accept AbortSignal; emulate via race
    const result = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), timeoutMs)
      ),
    ]);
    return Array.isArray(result) ? result : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function validateEmail(req, res) {
  try {
    const email = (req.body?.email || "").toString().trim();
    if (!email) {
      return res.status(400).json({ valid: false, message: "Email is required" });
    }
    if (!isEmailFormatValid(email)) {
      return res.status(200).json({ valid: false, message: "Invalid email format" });
    }
    const domain = email.split("@")[1];
    if (!domain) {
      return res.status(200).json({ valid: false, message: "Invalid email domain" });
    }

    // Allowlist corporate domains to avoid false negatives due to DNS policies
    const allowlist = new Set([
      "wellbridge.com",
      "coloradoathleticclubs.com",
      "sportsandwellness.com",
    ]);
    if (allowlist.has(domain.toLowerCase())) {
      return res.json({ valid: true });
    }

    // MX lookup (best-effort)
    try {
      const mx = await resolveMxWithTimeout(domain, 1500);
      // If there are no MX records, many deliverable domains still accept mail via A records.
      // Do not block; treat as soft-pass.
      return res.json({ valid: true });
    } catch (e) {
      logger.warn("MX lookup failed", { domain, error: e.message });
      // If DNS fails (server policy, firewall, etc.), do not block.
      return res.json({ valid: true });
    }
  } catch (error) {
    logger.error("validateEmail error", { error: error.message });
    return res.status(500).json({ valid: false, message: "Server error" });
  }
}

// Helpers
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
  // Format as MM/DD/YYYY which matches the working Informix DATE input
  const m = String(month).padStart(2, "0");
  return `${m}/01/${year}`;
}

// Lookup membership by membership number (cust_code) and derive club/state
export async function lookupMembership(req, res) {
  try {
    const membershipNumber = (req.query.membershipNumber || "")
      .toString()
      .trim();
    const clubId = (req.query.clubId || "").toString().trim(); // optional if membership implies it

    if (!membershipNumber) {
      return res
        .status(400)
        .json({ success: false, message: "membershipNumber is required" });
    }

    // Basic input validation: digits only, up to 10 chars
    const digitsOnly = /^[0-9]+$/;
    if (!digitsOnly.test(membershipNumber) || membershipNumber.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership number format",
      });
    }

    // Try requested club first, then fall back across both NM and CO clusters to avoid hard failures
    const preferred = clubId ? [parseInt(clubId, 10)] : [];
    const nmClubs = [201, 202, 203, 204, 205];
    const coClubs = [252, 254, 257, 292, 375];
    const allCandidates = [...preferred, ...nmClubs, ...coClubs];
    // de-duplicate while preserving order
    const seen = new Set();
    const clubsToTry = allCandidates.filter((c) => {
      const key = String(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let found = null;
    let foundClubId = null;
    for (const c of clubsToTry) {
      try {
        // Use stored procedure to get a single membership row
        const rows = await pool.query(
          c,
          "EXECUTE PROCEDURE web_proc_GetMembership(?)",
          [membershipNumber]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          // Validate essential fields
          const name =
            (row.membership_name || row.bus_name || "").toString().trim();
          const num =
            (row.membership_number || row.cust_code || "").toString().trim();
          if (name && num) {
            found = row;
            foundClubId = c;
            break;
          }
        }
      } catch (e) {
        logger.warn("lookup attempt failed", { club: c, error: e.message });
      }
    }

    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });
    }

    // Prefer the member's home club from the returned row; fall back to the DB shard we matched
    const memberClubIdRaw = (found?.club ?? found?.CLUB);
    const memberClubId = parseInt(memberClubIdRaw, 10);
    const resolvedClubId = Number.isFinite(memberClubId) ? memberClubId : foundClubId;

    const state =
      pool.getStateForClub(resolvedClubId) ||
      (found.state || found.STATE || "").toUpperCase();
    const club = {
      // Keep the DB shard id used for connections to avoid invalid IDs breaking subsequent queries
      id: String(foundClubId),
      state,
      // Provide the member's actual home club separately for display purposes
      homeClubId: Number.isFinite(memberClubId) ? String(memberClubId) : null,
      name: `Club ${Number.isFinite(memberClubId) ? memberClubId : foundClubId}`,
      email: process.env.DEFAULT_CLUB_EMAIL || "",
    };

    return res.json({
      success: true,
      member: {
        // Procedure-returned fields (one per line)
        membershipNumber: (found.membership_number || membershipNumber || "")
          .toString()
          .trim(),
        membershipName: (found.membership_name || "").toString().trim(),
        status: (found.status || "").toString().trim(),
        address1: (found.address1 || "").toString().trim(),
        address2: (found.address2 || "").toString().trim(),
        city: (found.city || "").toString().trim(),
        state: (found.state || "").toString().trim(),
        zipCode: (found.zip_code || "").toString().trim(),
        ccType: (found.cc_type || "").toString().trim(),
        cardNo: (found.card_no || "").toString().trim(),
        ccExpDate: (found.cc_exp_date || "").toString().trim(),
        token: (found.token || "").toString().trim(),
        // Back-compat for current UI
        firstName: "",
        lastName: "",
        address: (found.address1 || "").toString().trim(),
      },
      club,
    });
  } catch (error) {
    logger.error("lookupMembership error", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Get PT package (PT3PK/New Intro PT) and price used in Online_Enrollment
export async function getPTPackage(req, res) {
  try {
    const clubId = (req.query.clubId || "").toString().trim() || "001";
    const clubIdNum = parseInt(clubId, 10);
    if (!Number.isFinite(clubIdNum)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid clubId" });
    }
    const rows = await pool.query(
      clubIdNum,
      "EXECUTE PROCEDURE web_proc_GetOnlineSpecials(?)",
      [clubIdNum]
    );

    // Normalize rows similar to getOnlineSpecials
    const specials = [];
    let message = "";
    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        // Handle both named and unnamed columns (positional): [upc, description, price, tax]
        const values = Object.values(r);
        const upc =
          r.invtr_upccode ||
          r.upccode ||
          r.UPCCODE ||
          r.UPC ||
          r.upc ||
          (values.length > 0 ? values[0] : null) ||
          null;
        const description =
          r.invtr_desc ||
          r.description ||
          r.DESC ||
          r.DESC_TEXT ||
          r.DESC1 ||
          (values.length > 1 ? values[1] : "") ||
          "";
        const priceRaw =
          r.invtr_price ?? r.price ?? r.PRICE ?? (values.length > 2 ? values[2] : null);
        const price =
          priceRaw !== null && priceRaw !== undefined && priceRaw !== ""
            ? Number(priceRaw)
            : null;

        if (!upc && price === null && description) {
          message = String(description);
          continue;
        }
        if (description) {
          specials.push({
            upccode: upc !== null && upc !== undefined ? String(upc).trim() : null,
            description: description !== null && description !== undefined ? String(description).trim() : "",
            price: price !== null ? Number(price) : null,
          });
        }
      }
    }

    // Choose primary package: prefer first with UPC and a price; fall back to first with description
    let primary =
      specials.find((s) => s.upccode && s.price !== null) ||
      specials.find((s) => s.description) ||
      null;

    // If nothing usable, surface the message as description
    if (!primary) {
      primary = {
        upccode: null,
        description:
          message ||
          "No Online Specials found, please contact your club for our other great promotions!",
        price: null,
      };
    }

    const ptPackage = {
      description: primary.description,
      price: primary.price,
      invtr_upccode: primary.upccode || "",
    };

    return res.json({ success: true, ptPackage });
  } catch (error) {
    logger.error("getPTPackage error", { error: error.message });
    return res
      .status(500)
      .json({
        success: false,
        message: `Failed to retrieve PT package: ${error.message}`,
      });
  }
}

// Online specials for a club (Online_Purchase only) – displayed under the package card
export async function getOnlineSpecials(req, res) {
  try {
    const clubId = (req.query.clubId || "").toString().trim();
    if (!clubId) {
      return res
        .status(400)
        .json({ success: false, message: "clubId is required" });
    }
    const clubIdNum = parseInt(clubId, 10);
    if (!Number.isFinite(clubIdNum)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid clubId" });
    }
    const rows = await pool.query(
      clubIdNum,
      "EXECUTE PROCEDURE web_proc_GetOnlineSpecials(?)",
      [clubIdNum]
    );

    // Normalize response
    const specials = [];
    let message = "";

    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        // The procedure may return a single "message" row with null UPC if none exist
        // Handle both named and unnamed columns (positional): [upc, description, price, tax]
        const values = Object.values(r);
        const upc =
          r.invtr_upccode ||
          r.upccode ||
          r.UPCCODE ||
          r.UPC ||
          r.upc ||
          (values.length > 0 ? values[0] : null) ||
          null;
        const description =
          r.invtr_desc ||
          r.description ||
          r.DESC ||
          r.DESC_TEXT ||
          r.DESC1 ||
          (values.length > 1 ? values[1] : "") ||
          "";
        const priceRaw =
          r.invtr_price ?? r.price ?? r.PRICE ?? (values.length > 2 ? values[2] : null);
        const price =
          priceRaw !== null && priceRaw !== undefined && priceRaw !== ""
            ? Number(priceRaw)
            : null;
        const taxCode =
          r.classr_tax_code ||
          r.tax ||
          r.tax_code ||
          r.TAX ||
          r.TAX_CODE ||
          (values.length > 3 ? values[3] : null) ||
          null;

        if (!upc && !price && description) {
          // Treat this as info message row
          message = String(description);
          continue;
        }

        if (description) {
          specials.push({
            upccode: upc !== null && upc !== undefined ? String(upc).trim() : null,
            description: description !== null && description !== undefined ? String(description).trim() : "",
            price: price !== null ? Number(price) : null,
            taxCode:
              taxCode !== null && taxCode !== undefined ? String(taxCode).trim() : null,
          });
        }
      }
    }

    return res.json({ success: true, specials, message });
  } catch (error) {
    logger.error("getOnlineSpecials error", { error: error.message });
    return res
      .status(500)
      .json({
        success: false,
        message: `Failed to retrieve online specials: ${error.message}`,
      });
  }
}

// Purchase PT package – routes to FluidPay (CO) or Converge (NM)
export async function purchasePT(req, res) {
  try {
    const {
      clubId,
      member, // { membershipNumber, membershipName?, firstName, lastName, email, address, city, state, zipCode, phone }
      ptPackage, // { description, price, invtr_upccode }
      payment, // { processor: "FLUIDPAY"|"CONVERGE", token or card fields }
      contact = {}, // optional: { name, phone, email, goals, preferredTrainer } for internal email only
    } = req.body || {};

    if (!clubId || !member?.membershipNumber || !ptPackage?.price || !payment) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const state = pool.getStateForClub(clubId);
    const isColorado = state === "CO";
    const isNewMexico = state === "NM";

    // Ensure membershipName for emails; if not provided, fetch from DB
    let resolvedMemberName = (member?.membershipName || "").toString().trim();
    if (!resolvedMemberName) {
      try {
        const mRows = await pool.query(
          clubId,
          "EXECUTE PROCEDURE web_proc_GetMembership(?)",
          [member.membershipNumber]
        );
        if (Array.isArray(mRows) && mRows.length > 0) {
          const r = mRows[0] || {};
          resolvedMemberName =
            (r.membership_name || r.bus_name || "").toString().trim();
        }
      } catch (e) {
        // Non-fatal for purchase flow; continue without name if lookup fails
      }
    }

    let saleResult;
    const amount = Number(ptPackage.price);
    const customerData = {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      address: member.address || "",
      city: member.city || "",
      state: member.state || "",
      zipCode: member.zipCode || "",
      phone: member.phone || "",
    };

    if (isColorado) {
      if (!payment?.token) {
        return res
          .status(400)
          .json({ success: false, message: "FluidPay token is required" });
      }
      saleResult = await processFluidPaySale(
        clubId,
        amount,
        payment.token,
        customerData
      );
      saleResult.processorName = "FLUIDPAY";
    } else if (isNewMexico) {
      if (payment?.alreadyProcessed && payment?.transactionId) {
        // Treat HPP callback as success ONLY if clearly approved
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
          clubId,
          amount,
          payment,
          customerData
        );
        saleResult.processorName = "CONVERGE";
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported club/state configuration",
      });
    }

    if (!saleResult?.success) {
      return res.status(400).json({
        success: false,
        message: saleResult?.message || "Payment failed",
      });
    }

    // Post sale to production POS via web_proc_InsertPurchase (DB-atomic)
    // Frontend should provide cardBrand, cardMasked, and expDateMMYY when available
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
      ptPackage?.description ||
      "New Intro Personal Training Package";

    // Validate required DB params
    if (!ptPackage?.invtr_upccode) {
      return res.status(400).json({
        success: false,
        message: "PT package UPC is required for posting to POS",
      });
    }
    if (!issuer4 || !maskedCard || !expDate) {
      // We require masked card and expiration for tender SP
      return res.status(400).json({
        success: false,
        message:
          "Missing card details (brand, masked number, or expiration) for POS tender posting",
      });
    }

    let dbTransactionId = null;
    try {
      logger.info("web_proc_InsertPurchase request", {
        clubId,
        membershipNumber: member.membershipNumber,
        upc: ptPackage.invtr_upccode,
        qty,
        price: Number(ptPackage.price || amount || 0).toFixed(3),
        issuer4,
        expDate,
        maskedCard,
        salesRep,
        createGiftCert,
        approvalCode: saleResult?.approvalCode || null,
        guid: saleResult?.transactionId || null,
      });

      const rows = await pool.query(
        clubId,
        "EXECUTE PROCEDURE web_proc_InsertPurchase(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          member.membershipNumber, // parCustCode
          clubId, // parClub
          ptPackage.invtr_upccode, // parUPC
          qty, // parQty
          Number(ptPackage.price || amount || 0).toFixed(3), // parPrice (ignored by SP for totals)
          issuer4, // parCC_Issuer (CHAR(4))
          expDate, // parCC_Exp (DATE)
          maskedCard, // parCC_Masked
          salesRep, // parSalesRepEmpCode
          createGiftCert, // parCreateGiftCert
          description, // parDescription
          saleResult?.approvalCode || null, // parApproval_Code
          saleResult?.transactionId || null, // parGUID
        ]
      );

      // rows[0] should contain: result, sql_error, isam_error, error_msg, rsTrans
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        // Heuristic extraction: last column is rsTrans
        const values = Object.values(r);
        const rsTrans = values.length ? Number(values[values.length - 1]) : null;
        const resultCode = Number(values[0] ?? 0);

        logger.info("web_proc_InsertPurchase response", {
          rawRow: r,
          values,
          resultCode,
          rsTrans,
        });

        // Treat any non-zero result code or missing transaction as failure
        if (!rsTrans || resultCode !== 0) {
          const errMsg =
            (values.length > 3 && values[3] && String(values[3]).trim()) ||
            "Purchase posting failed (transaction not created)";
          logger.error("web_proc_InsertPurchase indicated failure", {
            resultCode,
            rsTrans,
            rawRow: r,
          });
          return res.status(500).json({
            success: false,
            message: errMsg,
            details: { resultCode, rsTrans },
          });
        }

        dbTransactionId = rsTrans;
      } else {
        logger.error("web_proc_InsertPurchase returned no rows");
        return res.status(500).json({
          success: false,
          message:
            "No result returned from web_proc_InsertPurchase; transaction not created",
        });
      }
    } catch (dbErr) {
      logger.error("web_proc_InsertPurchase error", {
        error: dbErr.message,
        stack: dbErr.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Database error while posting purchase",
        error: dbErr.message,
      });
    }

    // Best-effort: log online purchase form row (do not block purchase flow)
    try {
      const membershipNameForLog =
        (resolvedMemberName || member.membershipName || "").toString().trim() ||
        [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
      const contactNameForLog =
        (contact?.name || "").toString().trim() ||
        [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
      const phoneForLog =
        (contact?.phone || member.phone || "").toString().trim();
      const emailForLog =
        (contact?.email || member.email || "").toString().trim();

      await pool.query(
        clubId,
        "EXECUTE PROCEDURE web_proc_LogOnlinePurchase(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          Number(clubId), // parClubId
          String(member.membershipNumber || "").trim(), // parMembershipNo
          membershipNameForLog, // parMembershipName
          String(ptPackage?.invtr_upccode || "").trim(), // parPackageUPC
          String(ptPackage?.description || "").trim(), // parPackageDesc
          Number(ptPackage?.price ?? amount ?? 0).toFixed(2), // parPackagePrice
          contactNameForLog, // parContactName
          phoneForLog, // parPreferredPhone
          emailForLog, // parContactEmail
          (contact?.goals || "").toString().trim(), // parLookingToAchieve
          (contact?.preferredTrainer || "").toString().trim(), // parPreferredTrainerName
          String(member.email || emailForLog || "").trim(), // parReceiptEmail
          Number(dbTransactionId || 0), // parClubTransNo
          null, // parDatePurchased (use CURRENT in SP)
        ]
      );
    } catch (e) {
      logger.warn("purchasePT: web_proc_LogOnlinePurchase failed", {
        error: e.message,
        clubId,
        membershipNumber: member.membershipNumber,
        trans: dbTransactionId,
      });
    }

    // Map club id to full display name
    const clubIdStr = String(clubId);
    const CLUB_ID_TO_NAME = {
      "201": "Highpoint Sports & Wellness",
      "202": "Midtown Sports & Wellness",
      "203": "Downtown Sports & Wellness",
      "204": "Del Norte Sports & Wellness",
      "205": "Riverpoint Sports & Wellness",
      "252": "Colorado Athletic Club - DTC",
      "254": "Colorado Athletic Club - Tabor Center",
      "257": "Colorado Athletic Club - Flatirons",
      "292": "Colorado Athletic Club - Monaco",
    };
    const clubDisplayName = CLUB_ID_TO_NAME[clubIdStr] || `Club ${clubIdStr}`;

    // Fire-and-forget member receipt; do not block internal notifications
    const receiptPromise = emailService
      .sendPTPurchaseReceipt(
        {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          membershipNumber: member.membershipNumber,
          membershipName: resolvedMemberName || member.membershipName || "",
        },
        ptPackage,
        {
          processorName: saleResult.processorName,
          transactionId: saleResult.transactionId,
          amount,
          dbTransactionId,
        },
        {
          id: clubId,
          name: clubDisplayName,
          state,
          email: process.env.DEFAULT_CLUB_EMAIL || "",
        }
      )
      .then((ok) => {
        if (ok === false) {
          const subj = `Alert: Member receipt failed - ${clubDisplayName} - #${member.membershipNumber}`;
          const html = `
            <div>
              <div><strong>Membership #:</strong> ${member.membershipNumber}</div>
              <div><strong>Membership Name:</strong> ${resolvedMemberName || member.membershipName || ""}</div>
              <div><strong>Club:</strong> ${clubDisplayName}</div>
              <div><strong>Club Transaction #:</strong> ${dbTransactionId || ""}</div>
              <div style="margin-top:8px;">Member receipt email failed to send (non-blocking). Please review logs for details.</div>
            </div>
          `;
          // fire-and-forget ops alert
          emailService.sendOpsAlert("mmoore@wellbridge.com", subj, html).catch(() => {});
        }
        return ok;
      })
      .catch((e) => {
        logger.warn("Member PT receipt email send failed (non-blocking)", {
          error: e?.message,
        });
        const subj = `Alert: Member receipt exception - ${clubDisplayName} - #${member.membershipNumber}`;
        const html = `
          <div>
            <div><strong>Membership #:</strong> ${member.membershipNumber}</div>
            <div><strong>Membership Name:</strong> ${resolvedMemberName || member.membershipName || ""}</div>
            <div><strong>Club:</strong> ${clubDisplayName}</div>
            <div><strong>Club Transaction #:</strong> ${dbTransactionId || ""}</div>
            <div style="margin-top:8px;"><strong>Error:</strong> ${e?.message || "Unknown error"}</div>
          </div>
        `;
        emailService.sendOpsAlert("mmoore@wellbridge.com", subj, html).catch(() => {});
        return false;
      });

    // Internal notifications to PTM/GM/Regional using Online_Enrollment logic
    try {
      // GM emails by club id sourced from Online_Enrollment ClubContext
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
      const regionalEmail = state === "CO" ? "cacregptm@wellbridge.com" : state === "NM" ? "nmswregptm@wellbridge.com" : "";
      // Send to GM/PTM/Regional; BCC Mark separately in the email service
      const recipients = [gmEmail, ptmEmail, regionalEmail].filter(Boolean).join(", ");
      if (recipients) {
        await emailService.sendPTInternal(
          recipients,
          {
            membershipNumber: member.membershipNumber,
            membershipName: resolvedMemberName || member.membershipName || ""
          },
          { description: ptPackage.description, price: ptPackage.price },
          { id: clubId, name: clubDisplayName, state },
          member.email || "",
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
      logger.warn("Failed to send internal PT notifications", { error: e.message });
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

    return res.json({
      success: true,
      transactionId: saleResult.transactionId,
      processor: saleResult.processorName,
      dbTransactionId,
      last4,
    });
  } catch (error) {
    logger.error("purchasePT error", {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ success: false, message: "Server error during purchase" });
  }
}

export async function getFluidPayInfo(req, res) {
  try {
    const clubId = (req.query.clubId || "").toString().trim() || "001";

    logger.info("getFluidPayInfo: querying database", { clubId });
    const rows = await pool.query(
      clubId,
      "EXECUTE PROCEDURE procFluidPayItemSelect1(?)",
      [clubId]
    );

    logger.info("getFluidPayInfo: procedure executed", {
      clubId,
      rows: Array.isArray(rows) ? rows.length : 0,
      firstRow:
        Array.isArray(rows) && rows.length
          ? {
              ...rows[0],
              fluidpay_api_key: rows[0].fluidpay_api_key
                ? `${rows[0].fluidpay_api_key.slice(0, 8)}...`
                : null,
              fluidpay_public_key: rows[0].fluidpay_public_key
                ? `${rows[0].fluidpay_public_key.slice(0, 8)}...`
                : null,
            }
          : null,
    });

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FluidPay processor information not found for this club",
      });
    }

    const info = rows[0] || {};
    const envPublicKey =
      process.env.FLUIDPAY_PUBLIC_KEY ||
      process.env.FLUIDPAY_PUBLIC_API_KEY ||
      "";
    const rawPrivateKey = (info.fluidpay_api_key || "").toString().trim();
    const rawPublicKey = (info.fluidpay_public_key || "").toString().trim();

    let publicKey = "";
    if (envPublicKey && envPublicKey.startsWith("pub_")) {
      publicKey = envPublicKey.trim();
    } else if (rawPublicKey && rawPublicKey.startsWith("pub_")) {
      publicKey = rawPublicKey;
    } else if (rawPrivateKey && rawPrivateKey.startsWith("pub_")) {
      publicKey = rawPrivateKey;
    } else if (rawPrivateKey && rawPrivateKey.startsWith("api_")) {
      publicKey = rawPrivateKey.replace(/^api_/, "pub_");
    }

    logger.info("getFluidPayInfo: key normalization", {
      clubId,
      rawPrivateKeyPreview: rawPrivateKey
        ? `${rawPrivateKey.slice(0, 8)}...`
        : null,
      rawPublicKeyPreview: rawPublicKey
        ? `${rawPublicKey.slice(0, 8)}...`
        : null,
      envPublicKeyPreview: envPublicKey
        ? `${envPublicKey.slice(0, 8)}...`
        : null,
      derivedPublicKeyPreview: publicKey ? `${publicKey.slice(0, 8)}...` : null,
    });

    if (!publicKey || !publicKey.startsWith("pub_")) {
      return res.status(500).json({
        success: false,
        message: "FluidPay public API key is not configured correctly",
      });
    }

    return res.json({
      success: true,
      fluidPayInfo: {
        baseUrl: (info.fluidpay_base_url || "https://api.fluidpay.com").trim(),
        publicKey,
        merchantId: (info.merchant_id || "").toString().trim(),
      },
    });
  } catch (error) {
    logger.warn("getFluidPayInfo error, using fallback configuration", {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });

    const fallbackPublicKey =
      process.env.FLUIDPAY_PUBLIC_KEY ||
      process.env.FLUIDPAY_PUBLIC_API_KEY ||
      "pub_31FUYRENhNiAvspejegbLoPD2he";

    return res.json({
      success: true,
      fluidPayInfo: {
        baseUrl: process.env.FLUIDPAY_BASE_URL || "https://api.fluidpay.com",
        publicKey: fallbackPublicKey,
        merchantId: "",
        fallback: true,
      },
    });
  }
}

export async function createConvergeSessionToken(req, res) {
  try {
    const {
      amount,
      orderId,
      clubId,
      customerId,
      memberData,
      addToken = true,
    } = req.body || {};

    if (!amount || !orderId || !clubId) {
      return res.status(400).json({
        success: false,
        message: "amount, orderId, and clubId are required",
      });
    }

    const convergeRows = await pool.query(
      clubId,
      "EXECUTE PROCEDURE procConvergeItemSelect1(?)",
      [clubId]
    );

    if (!convergeRows || convergeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Converge configuration not found for this club",
      });
    }

    const info = convergeRows[0] || {};
    const merchantId = (info.merchant_id || "").toString().trim();
    const userId = (info.converge_user_id || "").toString().trim();
    const pin = (info.converge_pin || "").toString().trim();

    if (!merchantId || !userId || !pin) {
      return res.status(400).json({
        success: false,
        message: "Incomplete Converge processor configuration",
      });
    }

    const form = {
      ssl_merchant_id: merchantId,
      ssl_user_id: userId,
      ssl_pin: pin,
      ssl_transaction_type: "ccsale",
      ssl_amount: amount,
      ssl_currency_code: "USD",
      ssl_invoice_number: orderId,
      ssl_get_token: addToken ? "Y" : "N",
      ssl_add_token: addToken ? "Y" : "N",
      ssl_customer_id: customerId || undefined,
      ssl_first_name: memberData?.firstName || "",
      ssl_last_name: memberData?.lastName || "",
      ssl_avs_address: memberData?.address || "",
      ssl_avs_zip: memberData?.zipCode || "",
      ssl_avs_city: memberData?.city || "",
      ssl_avs_state: memberData?.state || "",
      ssl_avs_country: "US",
      ssl_email: memberData?.email || "",
      ssl_phone: memberData?.phone || "",
    };

    const url = "https://api.convergepay.com/hosted-payments/transaction_token";
    const response = await axios.post(url, qs.stringify(form), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
      responseType: "text",
      transformResponse: [(d) => d],
    });

    const raw = response.data;
    let token = null;
    if (typeof raw === "string") {
      const match = raw.match(/ssl_txn_auth_token\s*=\s*([^\n\r]+)/i);
      token = match ? match[1].trim() : raw.trim();
    } else if (raw && raw.ssl_txn_auth_token) {
      token = raw.ssl_txn_auth_token;
    }

    if (!token) {
      return res.status(502).json({
        success: false,
        message: "Unable to parse session token from Converge response",
        upstream: raw,
      });
    }

    return res.json({
      success: true,
      ssl_txn_auth_token: token,
      converge: {
        merchantId,
        userId,
      },
    });
  } catch (error) {
    logger.error("createConvergeSessionToken error", {
      error: error.message,
      stack: error.stack,
      upstream: error?.response?.data,
    });
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to create Converge session token",
      upstream: error?.response?.data || null,
    });
  }
}

export async function sendReceiptPreview(req, res) {
  try {
    const {
      toEmail = "mmoore@wellbridge.com",
      receipt = {},
      club = {},
    } = req.body || {};

    const ok = await emailService.sendPreviewReceipt(toEmail, {
      ...receipt,
      membershipName: receipt?.membershipName || req.body?.member?.membershipName || "",
      dbTransactionId: receipt?.dbTransactionId || req.body?.dbTransactionId || "DEMO123456",
    }, {
      id: club?.id || null,
      name: club?.name || (club?.id ? `Club ${club.id}` : "Club"),
      state: club?.state || null,
    });

    if (!ok) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send preview receipt" });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error("sendReceiptPreview error", {
      error: error.message,
      body: req.body,
    });
    return res
      .status(500)
      .json({ success: false, message: "Server error sending preview receipt" });
  }
}

export async function sendInternalPTPreview(req, res) {
  try {
    const {
      toEmail = "mmoore@wellbridge.com",
      member = {},
      ptPackage = {},
      club = {},
      receiptEmail = "",
      dbTransactionId = "DEMO123456",
      contact = {},
    } = req.body || {};

    const ok = await emailService.sendPreviewPTInternal(
      toEmail,
      {
        membershipNumber: (member?.membershipNumber || "").toString().trim(),
        membershipName: (member?.membershipName || "").toString().trim(),
      },
      {
        description: ptPackage?.description,
        price: ptPackage?.price,
      },
      {
        id: club?.id || null,
        name: club?.name || (club?.id ? `Club ${club.id}` : "Club"),
        state: club?.state || null,
      },
      (receiptEmail || "").toString().trim(),
      dbTransactionId,
      {
        name: (contact?.name || "").toString().trim(),
        phone: (contact?.phone || "").toString().trim(),
        email: (contact?.email || "").toString().trim(),
        goals: (contact?.goals || "").toString().trim(),
        preferredTrainer: (contact?.preferredTrainer || "").toString().trim(),
      }
    );

    if (!ok) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send internal preview PT notification" });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error("sendInternalPTPreview error", {
      error: error.message,
      body: req.body,
    });
    return res
      .status(500)
      .json({ success: false, message: "Server error sending internal preview PT notification" });
  }
}