// backend/src/routes/paymentRoutes.js
// This file contains API routes for handling payment processing.

import express from "express";
import { body } from "express-validator";
import logger from "../utils/logger.js";
import { 
  getCCProcessorName, 
  getFluidPayInfo, 
  getConvergeInfo, 
  processPaymentDemo 
} from "../controllers/paymentController.js";

const router = express.Router();

/**
 * Validation middleware for payment form data
 */
const validatePaymentData = [
  // Payment information validation
  body("clubId").trim().notEmpty().withMessage("Club ID is required"),
  body("cardNumber").trim().notEmpty().withMessage("Card number is required"),
  body("expiryDate")
    .trim()
    .notEmpty()
    .withMessage("Expiration date is required")
    .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .withMessage("Invalid expiration date format (MM/YY)"),
  body("cvv")
    .trim()
    .notEmpty()
    .withMessage("CVV is required")
    .matches(/^[0-9]{3,4}$/)
    .withMessage("Invalid CVV format"),
  body("nameOnCard").trim().notEmpty().withMessage("Name on card is required"),
  body("billingZipCode")
    .trim()
    .notEmpty()
    .withMessage("Billing ZIP code is required")
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Invalid ZIP code format")
];

/**
 * @route GET /api/payment/cc-processor
 * @desc Get credit card processor name for a club
 * @access Public
 */
router.get("/cc-processor", async (req, res) => {
  try {
    return await getCCProcessorName(req, res);
  } catch (error) {
    logger.error("Error in cc-processor route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the credit card processor. Please try again later.",
    });
  }
});

/**
 * @route GET /api/payment/fluidpay-info
 * @desc Get FluidPay payment processor information
 * @access Public
 */
router.get("/fluidpay-info", async (req, res) => {
  try {
    return await getFluidPayInfo(req, res);
  } catch (error) {
    logger.error("Error in fluidpay-info route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving FluidPay information. Please try again later.",
    });
  }
});

/**
 * @route GET /api/payment/converge-info
 * @desc Get Converge payment processor information
 * @access Public
 */
router.get("/converge-info", async (req, res) => {
  try {
    return await getConvergeInfo(req, res);
  } catch (error) {
    logger.error("Error in converge-info route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving Converge information. Please try again later.",
    });
  }
});

/**
 * @route POST /api/payment/process-demo
 * @desc Process a demo payment (no actual payment processing)
 * @access Public
 */
router.post("/process-demo", validatePaymentData, async (req, res) => {
  try {
    return await processPaymentDemo(req, res);
  } catch (error) {
    logger.error("Error in process-demo route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the demo payment. Please try again later.",
    });
  }
});

export default router;
