"use strict";

import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import {
  processConvergeSale,
  processFluidPaySale,
} from "../services/paymentService.js";
import emailService from "../services/emailService.js";

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
      // FluidPay hosted fields -> token expected
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
      // Converge – token or direct card (prefer token)
      saleResult = await processConvergeSale(
        clubId,
        amount,
        payment,
        customerData
      );
      saleResult.processorName = "CONVERGE";
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Unsupported club/state configuration",
        });
    }

    if (!saleResult?.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: saleResult?.message || "Payment failed",
        });
    }

    // Email receipt (member + PT Manager); no PDFs
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
