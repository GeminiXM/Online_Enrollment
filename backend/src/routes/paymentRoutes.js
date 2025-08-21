// backend/src/routes/paymentRoutes.js
// This file contains API routes for handling payment processing.

import express from "express";
import { body } from "express-validator";
import axios from "axios";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.js";
import { pool } from "../config/database.js";
import {
  getCCProcessorName,
  getFluidPayInfo,
  getConvergeInfo,
  getConvergeToken,
  processFluidPayPayment,
  testFluidPayConnection,
} from "../controllers/paymentController.js";

const router = express.Router();

// Database procedure execution function
const SQL_PROCEDURES_DIR = path.join(process.cwd(), "src", "sql", "procedures");

const executeSqlProcedure = async (procedureName, clubId, params = []) => {
  try {
    // Construct the file path
    const filePath = path.join(SQL_PROCEDURES_DIR, `${procedureName}.sql`);

    // Read the file content
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Extract procedure name from the file (assumes format "execute procedure NAME(params)")
    const procedureNameMatch = fileContent.match(
      /execute\s+procedure\s+([^\s(]+)/i
    );

    if (!procedureNameMatch) {
      throw new Error(
        `Could not parse procedure name from file: ${procedureName}.sql`
      );
    }

    const actualProcedureName = procedureNameMatch[1];

    // Log the procedure execution
    logger.info(`Executing SQL procedure: ${actualProcedureName}`, {
      club: clubId,
      params: params.map((p) =>
        typeof p === "string" ? p.substring(0, 20) : p
      ),
    });

    // Execute the procedure
    const query = `EXECUTE PROCEDURE ${actualProcedureName}(${Array(
      params.length
    )
      .fill("?")
      .join(", ")})`;
    return await pool.query(clubId, query, params);
  } catch (error) {
    logger.error(`Error executing SQL procedure: ${procedureName}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

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
    .withMessage("Invalid ZIP code format"),
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
      message:
        "An error occurred while retrieving the credit card processor. Please try again later.",
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
      message:
        "An error occurred while retrieving FluidPay information. Please try again later.",
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
      message:
        "An error occurred while retrieving Converge information. Please try again later.",
    });
  }
});

/**
 * @route POST /api/payment/converge-token
 * @desc Get Converge transaction token for payment processing
 * @access Public
 */
router.post("/converge-token", async (req, res) => {
  try {
    return await getConvergeToken(req, res);
  } catch (error) {
    logger.error("Error in converge-token route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while generating the Converge token. Please try again later.",
    });
  }
});

/**
 * @route POST /api/payment/test-fluidpay
 * @desc Test FluidPay credentials and connection
 * @access Public
 */
router.post("/test-fluidpay", async (req, res) => {
  try {
    return await testFluidPayConnection(req, res);
  } catch (error) {
    logger.error("Error in test-fluidpay route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while testing the FluidPay connection. Please try again later.",
    });
  }
});

/**
 * @route POST /api/payment/process-fluidpay
 * @desc Process FluidPay payment with token
 * @access Public
 */
router.post("/process-fluidpay", async (req, res) => {
  try {
    return await processFluidPayPayment(req, res);
  } catch (error) {
    logger.error("Error in process-fluidpay route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while processing the FluidPay payment. Please try again later.",
    });
  }
});

// Converge direct API payment endpoint
router.post("/converge", async (req, res) => {
  try {
    const paymentData = req.body;

    logger.info("Processing Converge payment:", {
      amount: paymentData.ssl_amount,
      merchant_id: paymentData.ssl_merchant_id,
      transaction_type: paymentData.ssl_transaction_type,
    });

    // Send payment data to Converge API
    const response = await axios.post(
      paymentData.ssl_url_process ||
        "https://api.convergepay.com/VirtualMerchant/process.do",
      paymentData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Parse Converge response
    const responseData = response.data;
    logger.info("Converge API response:", responseData);

    // Check if payment was successful
    if (responseData.ssl_result === "0") {
      // Payment successful
      res.json({
        success: true,
        transaction_id: responseData.ssl_txn_id,
        authorization_code: responseData.ssl_approval_code,
        payment_token: responseData.ssl_token || null, // Converge payment token
        message: "Payment processed successfully",
      });
    } else {
      // Payment failed
      res.json({
        success: false,
        message: responseData.ssl_result_message || "Payment failed",
        error_code: responseData.ssl_result,
      });
    }
  } catch (error) {
    logger.error("Converge payment error:", error);

    res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again.",
      error: error.message,
    });
  }
});

// Converge hosted fields tokenization endpoint
router.post("/converge-tokenize", async (req, res) => {
  try {
    const { cardData, convergeInfo } = req.body;

    logger.info("Processing Converge hosted fields tokenization:", {
      merchant_id: convergeInfo.ssl_merchant_id,
      transaction_type: "ccgettoken",
    });

    // Create tokenization request for Converge
    const tokenizationData = {
      ssl_merchant_id: convergeInfo.ssl_merchant_id?.trim(),
      ssl_user_id: convergeInfo.ssl_user_id?.trim(),
      ssl_pin: convergeInfo.ssl_pin?.trim(),
      ssl_transaction_type: "ccgettoken",
      ssl_card_number: cardData.cardNumber,
      ssl_exp_date: cardData.expiryDate,
      ssl_cvv2cvc2: cardData.cvv,
      ssl_first_name: cardData.firstName,
      ssl_last_name: cardData.lastName,
      ssl_result_format: "JSON",
      ssl_show_form: "false",
      ssl_show_receipt: "false",
    };

    logger.info("Tokenization data being sent to Converge:", {
      merchant_id: tokenizationData.ssl_merchant_id,
      user_id: tokenizationData.ssl_user_id,
      card_number_length: cardData.cardNumber ? cardData.cardNumber.length : 0,
      expiry_date: cardData.expiryDate,
      cvv_length: cardData.cvv ? cardData.cvv.length : 0,
      first_name: cardData.firstName,
      last_name: cardData.lastName,
    });

    // Send tokenization request to Converge
    const response = await axios.post(
      convergeInfo.ssl_url_process ||
        "https://api.convergepay.com/VirtualMerchant/process.do",
      tokenizationData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 30000,
      }
    );

    const responseData = response.data;
    logger.info("Converge tokenization response:", responseData);

    if (responseData.ssl_result === "0") {
      // Tokenization successful
      res.json({
        success: true,
        token: responseData.ssl_token,
        message: "Card tokenized successfully",
      });
    } else {
      // Tokenization failed
      res.json({
        success: false,
        message: responseData.ssl_result_message || "Tokenization failed",
        error_code: responseData.ssl_result,
      });
    }
  } catch (error) {
    logger.error("Converge tokenization error:", error);

    res.status(500).json({
      success: false,
      message: "Tokenization failed. Please try again.",
      error: error.message,
    });
  }
});

// Converge payment with token endpoint
router.post("/converge-pay-with-token", async (req, res) => {
  try {
    const { token, amount, convergeInfo, customerData } = req.body;

    logger.info("Processing Converge payment with token:", {
      amount: amount,
      merchant_id: convergeInfo.ssl_merchant_id,
      transaction_type: "ccsale",
    });

    // Create payment request using token
    const paymentData = {
      ssl_merchant_id: convergeInfo.ssl_merchant_id?.trim(),
      ssl_user_id: convergeInfo.ssl_user_id?.trim(),
      ssl_pin: convergeInfo.ssl_pin?.trim(),
      ssl_transaction_type: "ccsale",
      ssl_amount: amount,
      ssl_token: token,
      ssl_first_name: customerData.firstName,
      ssl_last_name: customerData.lastName,
      ssl_avs_address: customerData.address || "",
      ssl_city: customerData.city || "",
      ssl_state: customerData.state || "",
      ssl_avs_zip: customerData.zipCode || "",
      ssl_email: customerData.email || "",
      ssl_phone: customerData.phone || "",
      ssl_description: "Membership Enrollment - Standard",
      ssl_result_format: "JSON",
    };

    // Send payment request to Converge
    const response = await axios.post(
      convergeInfo.ssl_url_process ||
        "https://api.convergepay.com/VirtualMerchant/process.do",
      paymentData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 30000,
      }
    );

    const responseData = response.data;
    logger.info("Converge payment response:", responseData);

    if (responseData.ssl_result === "0") {
      // Payment successful
      res.json({
        success: true,
        transaction_id: responseData.ssl_txn_id,
        authorization_code: responseData.ssl_approval_code,
        payment_token: token, // Return the same token for future use
        message: "Payment processed successfully",
      });
    } else {
      // Payment failed - handle specific Converge error codes
      const errorCode = responseData.ssl_result;
      const errorMessage = responseData.ssl_result_message || "Payment failed";

      logger.error("Converge payment failed:", {
        error_code: errorCode,
        error_message: errorMessage,
        amount: amount,
        full_response: responseData,
      });

      // Map common Converge error codes to user-friendly messages
      let userMessage = "Payment failed. Please try again.";

      switch (errorCode) {
        case "1":
          userMessage = "Invalid merchant credentials. Please contact support.";
          break;
        case "2":
          userMessage = "Invalid card information. Please check and try again.";
          break;
        case "3":
          userMessage = "Invalid amount. Please contact support.";
          break;
        case "4":
          userMessage = "Invalid token. Please try again.";
          break;
        case "5":
          userMessage = "Card declined. Please try a different card.";
          break;
        case "6":
          userMessage = "Insufficient funds. Please try a different card.";
          break;
        case "7":
          userMessage = "Card expired. Please use a different card.";
          break;
        case "8":
          userMessage = "Invalid transaction type. Please contact support.";
          break;
        case "9":
          userMessage = "Transaction timeout. Please try again.";
          break;
        case "10":
          userMessage = "System error. Please try again later.";
          break;
        case "11":
          userMessage = "Duplicate transaction. Please contact support.";
          break;
        case "12":
          userMessage = "Transaction not found. Please contact support.";
          break;
        default:
          userMessage =
            errorMessage || "Payment processing error. Please try again.";
      }

      res.json({
        success: false,
        message: userMessage,
        error_code: errorCode,
        error_details: errorMessage,
        retry_allowed: !["1", "2", "3", "4", "7", "8", "11", "12"].includes(
          errorCode
        ), // Don't retry for credential/card format/duplicate errors
      });
    }
  } catch (error) {
    logger.error("Converge payment with token error:", error);

    res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again.",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/payment/process-demo
 * @desc Process a real payment using Converge API (direct ccsale)
 * @access Public
 */
router.post("/process-demo", validatePaymentData, async (req, res) => {
  try {
    const {
      clubId,
      cardNumber,
      expiryDate,
      cvv,
      nameOnCard,
      billingZipCode,
      amount,
      membershipDetails,
      processorName,
    } = req.body;

    logger.info("Processing real payment via Converge API:", {
      clubId,
      amount,
      processorName,
      cardNumberLength: cardNumber ? cardNumber.length : 0,
      lastFour: cardNumber ? cardNumber.slice(-4) : "N/A",
    });

    // Get Converge processor information directly from database
    let convergeInfo = null;
    try {
      const convergeResult = await executeSqlProcedure(
        "procConvergeItemSelect1",
        clubId,
        [clubId]
      );

      if (convergeResult && convergeResult.length > 0) {
        const firstRow = convergeResult[0];
        if (firstRow) {
          convergeInfo = {
            merchant_id: firstRow.merchant_id || "",
            converge_user_id: firstRow.converge_user_id || "",
            converge_pin: firstRow.converge_pin || "",
            converge_url_process: firstRow.converge_url_process || "",
            converge_url_process_batch:
              firstRow.converge_url_process_batch || "",
            converge_cvv2_indicator: firstRow.converge_cvv2_indicator || "",
          };
        }
      }

      if (!convergeInfo) {
        throw new Error("Converge processor information not found");
      }
    } catch (error) {
      logger.error("Error getting Converge info:", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error("Failed to retrieve Converge processor information");
    }

    // Parse expiry date (MM/YY format)
    const [expiryMonth, expiryYear] = expiryDate.split("/");
    const formattedExpiry = `${expiryMonth}${expiryYear}`;

    // Parse name on card
    const nameParts = nameOnCard.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create payment request for Converge Lightbox (hosted form)
    const paymentData = {
      ssl_merchant_id: convergeInfo.merchant_id?.trim(),
      ssl_user_id: convergeInfo.converge_user_id?.trim(),
      ssl_pin: convergeInfo.converge_pin?.trim(),
      ssl_transaction_type: "ccsale",
      ssl_amount: amount,
      ssl_invoice_number: `INV-${Date.now()}`,
      ssl_description: `Membership Enrollment - ${
        membershipDetails?.description || "Standard"
      }`,
      ssl_first_name: firstName,
      ssl_last_name: lastName,
      ssl_avs_address: billingZipCode,
      ssl_avs_zip: billingZipCode,
      ssl_cvv2_indicator: convergeInfo.converge_cvv2_indicator || "N",
      ssl_result_format: "HTML",
      ssl_show_form: "true",
      ssl_show_receipt: "true",
      ssl_receipt_link_method: "REDG",
      ssl_receipt_link_url: `${req.protocol}://${req.get(
        "host"
      )}/online-enrollment/payment-success`,
      ssl_receipt_link_text: "Return to Enrollment",
    };

    logger.info("Sending payment request to Converge:", {
      merchantId: paymentData.ssl_merchant_id,
      amount: paymentData.ssl_amount,
      transactionType: paymentData.ssl_transaction_type,
      cardNumberLength: cardNumber.length,
      lastFour: cardNumber.slice(-4),
    });

    // Return the hosted form URL for Converge Lightbox
    const hostedFormUrl = convergeInfo.converge_url_process;

    logger.info("Returning Converge hosted form URL:", {
      hostedFormUrl,
      paymentData: {
        merchantId: paymentData.ssl_merchant_id,
        amount: paymentData.ssl_amount,
        transactionType: paymentData.ssl_transaction_type,
        resultFormat: paymentData.ssl_result_format,
      },
    });

    // Return the hosted form data for frontend to submit
    res.json({
      success: true,
      hostedFormUrl: hostedFormUrl,
      paymentData: paymentData,
      message: "Redirecting to Converge hosted payment form",
    });
  } catch (error) {
    logger.error("Error in process-demo route:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again.",
      error: error.message,
    });
  }
});

export default router;
