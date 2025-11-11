"use strict";

import express from "express";
import { lookupMembership, getPTPackage, purchasePT } from "../controllers/onlineBuyController.js";

const router = express.Router();

// GET /api/online-buy/member?membershipNumber=...&clubId=...
router.get("/member", lookupMembership);

// GET /api/online-buy/pt-package?clubId=...
router.get("/pt-package", getPTPackage);

// POST /api/online-buy/purchase
router.post("/purchase", purchasePT);

export default router;


