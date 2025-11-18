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

    // Heuristic: require clubId input to resolve DB; if not provided, try both CO and NM common ranges
    const clubsToTry = clubId
      ? [parseInt(clubId)]
      : [203, 252, 253, 254, 201, 202, 204, 205, 292, 257, 375];

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
          found = rows[0];
          foundClubId = c;
          break;
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

    const state =
      pool.getStateForClub(foundClubId) ||
      (found.state || found.STATE || "").toUpperCase();
    const club = {
      id: foundClubId,
      state,
      name: `Club ${foundClubId}`,
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
    const rows = await pool.query(
      clubId,
      "EXECUTE PROCEDURE procNewMemberPTPackageListSelect1(?)",
      [clubId]
    );
    let ptPackage = null;
    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0];
      ptPackage = {
        description:
          r.invtr_desc ||
          r.description ||
          "New Intro Personal Training Package",
        price: parseFloat(r.invtr_price || r.price || 149),
        invtr_upccode: r.invtr_upccode || r.upc || "",
      };
    } else {
      ptPackage = {
        description: "New Intro Personal Training Package",
        price: 149,
        invtr_upccode: "PT001",
      };
    }
    return res.json({ success: true, ptPackage });
  } catch (error) {
    logger.error("getPTPackage error", { error: error.message });
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve PT package" });
  }
}

// Purchase PT package – routes to FluidPay (CO) or Converge (NM)
export async function purchasePT(req, res) {
  try {
    const {
      clubId,
      member, // { membershipNumber, firstName, lastName, email, address, city, state, zipCode, phone }
      ptPackage, // { description, price, invtr_upccode }
      payment, // { processor: "FLUIDPAY"|"CONVERGE", token or card fields }
    } = req.body || {};

    if (!clubId || !member?.membershipNumber || !ptPackage?.price || !payment) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const state = pool.getStateForClub(clubId);
    const isColorado = state === "CO";
    const isNewMexico = state === "NM";

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
        saleResult = {
          success: true,
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
      });

      const rows = await pool.query(
        clubId,
        "EXECUTE PROCEDURE web_proc_InsertPurchase(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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

        if (!rsTrans) {
          const errMsg =
            (values.length > 3 && values[3] && String(values[3]).trim()) ||
            "Purchase posting failed (no transaction id returned)";
          return res.status(500).json({
            success: false,
            message: errMsg,
            details: { resultCode, rsTrans, row: r },
          });
        }

        // rsTrans is present, so a POS transaction was created.
        // If resultCode is non-zero, treat it as a warning but NOT a hard failure.
        if (resultCode !== 0) {
          logger.warn("web_proc_InsertPurchase non-zero resultCode with valid rsTrans", {
            resultCode,
            rsTrans,
            rawRow: r,
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

    // Email receipt (member + PT Manager); no PDFs, include DB transaction id when available
    await emailService.sendPTPurchaseReceipt(
      {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        membershipNumber: member.membershipNumber,
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
        name: `Club ${clubId}`,
        state,
        email: process.env.DEFAULT_CLUB_EMAIL || "",
      }
    );

    return res.json({
      success: true,
      transactionId: saleResult.transactionId,
      processor: saleResult.processorName,
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
