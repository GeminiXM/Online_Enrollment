"use strict";

import express from "express";
import {
  lookupMembership,
  getPTPackage,
  purchasePT,
  getFluidPayInfo,
  createConvergeSessionToken,
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

export default router;
