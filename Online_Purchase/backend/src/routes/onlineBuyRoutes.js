"use strict";

import express from "express";
import {
  lookupMembership,
  getPTPackage,
  purchasePT,
  getFluidPayInfo,
  createConvergeSessionToken,
  sendReceiptPreview,
  validateEmail,
  sendInternalPTPreview,
} from "../controllers/onlineBuyController.js";

const router = express.Router();

// GET /api/online-buy/member?membershipNumber=...&clubId=...
router.get("/member", lookupMembership);

// GET /api/online-buy/pt-package?clubId=...
router.get("/pt-package", getPTPackage);

// POST /api/online-buy/purchase
router.post("/purchase", purchasePT);

// GET /api/online-buy/fluidpay-info
router.get("/fluidpay-info", getFluidPayInfo);

// POST /api/online-buy/converge-hpp/session-token
router.post("/converge-hpp/session-token", createConvergeSessionToken);

// POST /api/online-buy/send-receipt-preview
router.post("/send-receipt-preview", sendReceiptPreview);

// POST /api/online-buy/validate-email
router.post("/validate-email", validateEmail);

// POST /api/online-buy/send-internal-pt-preview
router.post("/send-internal-pt-preview", sendInternalPTPreview);

export default router;
