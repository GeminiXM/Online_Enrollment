// backend/src/routes/paymentRoutes.js
// This file contains API routes for handling payment processing.

import express from "express";
import { body } from "express-validator";
import axios from "axios";
import qs from "qs";
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
  testFluidPayTransaction,
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
 * @route POST /api/payment/test-fluidpay-transaction
 * @desc Test FluidPay transaction processing with detailed logging
 * @access Public
 */
router.post("/test-fluidpay-transaction", async (req, res) => {
  try {
    return await testFluidPayTransaction(req, res);
  } catch (error) {
    logger.error("Error in test-fluidpay-transaction route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while testing FluidPay transaction. Please try again later.",
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

// Get session token for Checkout.js
router.post("/get-session-token", async (req, res) => {
  try {
    // Get credentials from database (using club 203 for now)
    const clubId = 203;

    // Get Converge processor information
    const convergeResult = await executeSqlProcedure(
      "procConvergeItemSelect1",
      clubId,
      [clubId]
    );

    let convergeInfo = null;
    if (convergeResult && convergeResult.length > 0) {
      const firstRow = convergeResult[0];
      if (firstRow) {
        convergeInfo = {
          merchant_id: firstRow.merchant_id || "",
          converge_user_id: firstRow.converge_user_id || "",
          converge_pin: firstRow.converge_pin || "",
          converge_url_process: firstRow.converge_url_process || "",
        };
      }
    }

    if (
      !convergeInfo ||
      !convergeInfo.merchant_id ||
      !convergeInfo.converge_user_id ||
      !convergeInfo.converge_pin
    ) {
      throw new Error("Converge processor information not found or incomplete");
    }

    logger.info("Getting session token for Checkout.js:", {
      clubId,
      merchant_id: convergeInfo.merchant_id,
      user_id: convergeInfo.converge_user_id,
      pin_length: convergeInfo.converge_pin
        ? convergeInfo.converge_pin.length
        : 0,
    });

    // Request session token from Converge using DB credentials
    const params = new URLSearchParams({
      ssl_transaction_type: "ccsale",
      ssl_merchant_id: convergeInfo.merchant_id?.trim(),
      ssl_user_id: convergeInfo.converge_user_id?.trim(),
      ssl_pin: convergeInfo.converge_pin?.trim(),
      ssl_vendor_id: convergeInfo.merchant_id?.trim(),
      ssl_amount: String(amount ?? "1.00"),
      ssl_add_token: "Y",
      ssl_get_token: "Y",
    });

    logger.info("Session token request parameters:", {
      ssl_transaction_type: "ccsale",
      ssl_account_id: convergeInfo.merchant_id.trim(),
      ssl_user_id: convergeInfo.converge_user_id.trim(),
      ssl_pin_length: convergeInfo.converge_pin.trim().length,
      ssl_vendor_id: convergeInfo.merchant_id.trim(),
      ssl_amount: "1.00",
      ssl_add_token: "Y",
      ssl_get_token: "Y",
    });

    const response = await axios.post(
      "https://api.convergepay.com/hosted-payments/transaction_token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    logger.info("Session token received successfully");

    // Response is a plain string (the token)
    res.json({ sessionToken: response.data });
  } catch (error) {
    logger.error("Error getting session token:", error);
    res
      .status(500)
      .json({ error: "Failed to get session token: " + error.message });
  }
});

// Process payment with temp token and get vault token
router.post("/process-payment", async (req, res) => {
  try {
    const { tempToken, amount, billingInfo } = req.body;

    if (!tempToken || !amount || !billingInfo) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get credentials from database (using club 203 for now)
    const clubId = 203;

    // Get Converge processor information
    const convergeResult = await executeSqlProcedure(
      "procConvergeItemSelect1",
      clubId,
      [clubId]
    );

    let convergeInfo = null;
    if (convergeResult && convergeResult.length > 0) {
      const firstRow = convergeResult[0];
      if (firstRow) {
        convergeInfo = {
          merchant_id: firstRow.merchant_id || "",
          converge_user_id: firstRow.converge_user_id || "",
          converge_pin: firstRow.converge_pin || "",
          converge_url_process: firstRow.converge_url_process || "",
        };
      }
    }

    if (
      !convergeInfo ||
      !convergeInfo.merchant_id ||
      !convergeInfo.converge_user_id ||
      !convergeInfo.converge_pin
    ) {
      throw new Error("Converge processor information not found or incomplete");
    }

    logger.info("Processing payment with temp token:", {
      clubId,
      amount,
      tempTokenLength: tempToken ? tempToken.length : 0,
      merchant_id: convergeInfo.merchant_id,
    });

    // Create XML request for payment processing using demo credentials
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<txn>
  <ssl_merchant_id>0020159</ssl_merchant_id>
  <ssl_user_id>webpage</ssl_user_id>
  <ssl_pin>123456</ssl_pin>
  <ssl_transaction_type>ccsale</ssl_transaction_type>
  <ssl_token>${tempToken}</ssl_token>
  <ssl_amount>${amount}</ssl_amount>
  <ssl_add_token>Y</ssl_add_token>
  <ssl_first_name>${billingInfo.firstName || ""}</ssl_first_name>
  <ssl_last_name>${billingInfo.lastName || ""}</ssl_last_name>
  <ssl_avs_address>${billingInfo.address || ""}</ssl_avs_address>
  <ssl_city>${billingInfo.city || ""}</ssl_city>
  <ssl_state>${billingInfo.state || ""}</ssl_state>
  <ssl_avs_zip>${billingInfo.zipCode || ""}</ssl_avs_zip>
  <ssl_email>${billingInfo.email || ""}</ssl_email>
  <ssl_description>Checkout.js Test Payment</ssl_description>
  <ssl_result_format>JSON</ssl_result_format>
  <ssl_test_mode>true</ssl_test_mode>
</txn>`;

    logger.info("Sending XML payment request:", {
      xmlLength: xmlBody.length,
      endpoint:
        "https://api.demo.convergepay.com/VirtualMerchant/processxml.do",
    });

    const response = await axios.post(
      "https://api.demo.convergepay.com/VirtualMerchant/processxml.do",
      xmlBody,
      {
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );

    logger.info("Payment response received:", {
      status: response.status,
      contentType: response.headers["content-type"],
      dataLength: response.data ? response.data.length : 0,
    });

    // Parse XML response
    const responseData = response.data;
    let parsedResponse;

    if (typeof responseData === "string" && responseData.includes("<?xml")) {
      // Parse XML response
      const resultMatch = responseData.match(
        /<ssl_result>([^<]+)<\/ssl_result>/
      );
      const messageMatch = responseData.match(
        /<ssl_result_message>([^<]+)<\/ssl_result_message>/
      );
      const txnIdMatch = responseData.match(
        /<ssl_txn_id>([^<]+)<\/ssl_txn_id>/
      );
      const tokenMatch = responseData.match(/<ssl_token>([^<]+)<\/ssl_token>/);

      parsedResponse = {
        ssl_result: resultMatch ? resultMatch[1] : null,
        ssl_result_message: messageMatch ? messageMatch[1] : null,
        ssl_txn_id: txnIdMatch ? txnIdMatch[1] : null,
        ssl_token: tokenMatch ? tokenMatch[1] : null,
      };
    } else {
      // JSON response
      parsedResponse = responseData;
    }

    logger.info("Parsed payment response:", parsedResponse);

    const success = parsedResponse.ssl_result === "0";
    const vaultToken = parsedResponse.ssl_token;

    if (success && vaultToken) {
      logger.info("Payment successful, vault token generated:", {
        txnId: parsedResponse.ssl_txn_id,
        vaultTokenLength: vaultToken.length,
      });

      res.json({
        success: true,
        vaultToken,
        txnId: parsedResponse.ssl_txn_id,
        message:
          parsedResponse.ssl_result_message || "Payment processed successfully",
      });
    } else {
      logger.error("Payment failed:", {
        result: parsedResponse.ssl_result,
        message: parsedResponse.ssl_result_message,
      });

      res.json({
        success: false,
        message: parsedResponse.ssl_result_message || "Payment failed",
      });
    }
  } catch (error) {
    logger.error("Error processing payment:", error);
    res.status(500).json({ error: "Payment failed: " + error.message });
  }
});

/**
 * @route POST /api/payment/converge-tokenize-and-pay
 * @desc Process payment and generate vault token in one step
 * @access Public
 */
router.post("/converge-tokenize-and-pay", async (req, res) => {
  try {
    const { cardData, amount, convergeInfo, customerData } = req.body;

    logger.info("Processing Converge tokenize and pay:", {
      amount,
      cardNumberLength: cardData?.cardNumber ? cardData.cardNumber.length : 0,
      lastFour: cardData?.cardNumber ? cardData.cardNumber.slice(-4) : "N/A",
      customerName: customerData
        ? `${customerData.firstName} ${customerData.lastName}`
        : "N/A",
    });

    // Get Converge processor information from database if not provided
    let processorInfo = convergeInfo;
    if (!processorInfo) {
      try {
        // Default to club ID 1 for testing - you may want to make this configurable
        const clubId = 1;
        const convergeResult = await executeSqlProcedure(
          "procConvergeItemSelect1",
          clubId,
          [clubId]
        );

        if (convergeResult && convergeResult.length > 0) {
          const firstRow = convergeResult[0];
          processorInfo = {
            ssl_account_id: firstRow.merchant_id || "",
            ssl_user_id: firstRow.converge_user_id || "",
            ssl_pin: firstRow.converge_pin || "",
            ssl_vendor_id: firstRow.converge_vendor_id || "",
            ssl_url_process:
              firstRow.converge_url_process ||
              "https://api.convergepay.com/VirtualMerchant/processxml.do",
          };
        }
      } catch (error) {
        logger.error("Error getting Converge info from database:", error);
        throw new Error("Failed to retrieve Converge processor information");
      }
    }

    if (!processorInfo) {
      throw new Error("Converge processor information not found");
    }

    // Extract values for XML construction
    const merchantId = processorInfo.ssl_account_id?.trim();
    const userId = processorInfo.ssl_user_id?.trim();
    const pin = processorInfo.ssl_pin?.trim();
    const vendorId = processorInfo.ssl_vendor_id?.trim();

    logger.info("Using Converge credentials:", {
      merchantId: merchantId ? `${merchantId.substring(0, 4)}****` : "N/A",
      userId: userId ? `${userId.substring(0, 4)}****` : "N/A",
      vendorId: vendorId ? `${vendorId.substring(0, 4)}****` : "N/A",
    });

    // Parse expiry date (MMYY format)
    const expiryDate = cardData.expiryDate;
    const expiryMonth = expiryDate.substring(0, 2);
    const expiryYear = expiryDate.substring(2, 4);

    // Create XML request for payment with vault token generation
    const xmlBody = `<?xml version="1.0"?>
<txn>
  <ssl_merchant_id>${merchantId}</ssl_merchant_id>
  <ssl_user_id>${userId}</ssl_user_id>
  <ssl_pin>${pin}</ssl_pin>
  <ssl_vendor_id>${vendorId}</ssl_vendor_id>
  <ssl_transaction_type>ccsale</ssl_transaction_type>
  <ssl_amount>${amount}</ssl_amount>
  <ssl_card_number>${cardData.cardNumber}</ssl_card_number>
  <ssl_exp_date>${expiryMonth}${expiryYear}</ssl_exp_date>
  <ssl_cvv2cvc2>${cardData.cvv}</ssl_cvv2cvc2>
  <ssl_cvv2cvc2_indicator>1</ssl_cvv2cvc2_indicator>
  <ssl_add_token>Y</ssl_add_token>
  <ssl_first_name>${customerData.firstName || ""}</ssl_first_name>
  <ssl_last_name>${customerData.lastName || ""}</ssl_last_name>
  <ssl_avs_address>${customerData.address || ""}</ssl_avs_address>
  <ssl_city>${customerData.city || ""}</ssl_city>
  <ssl_state>${customerData.state || ""}</ssl_state>
  <ssl_avs_zip>${customerData.zipCode || ""}</ssl_avs_zip>
  <ssl_email>${customerData.email || ""}</ssl_email>
  <ssl_description>Direct Payment Test</ssl_description>
  <ssl_result_format>JSON</ssl_result_format>
</txn>`;

    logger.info("Sending XML payment request:", {
      xmlLength: xmlBody.length,
      endpoint: processorInfo.ssl_url_process,
    });

    const response = await axios.post(processorInfo.ssl_url_process, xmlBody, {
      headers: {
        "Content-Type": "text/xml",
      },
    });

    logger.info("Payment response received:", {
      status: response.status,
      contentType: response.headers["content-type"],
      dataLength: response.data ? response.data.length : 0,
    });

    // Parse XML response
    const responseData = response.data;
    let parsedResponse;

    if (typeof responseData === "string" && responseData.includes("<?xml")) {
      // Parse XML response
      const resultMatch = responseData.match(
        /<ssl_result>([^<]+)<\/ssl_result>/
      );
      const messageMatch = responseData.match(
        /<ssl_result_message>([^<]+)<\/ssl_result_message>/
      );
      const txnIdMatch = responseData.match(
        /<ssl_txn_id>([^<]+)<\/ssl_txn_id>/
      );
      const tokenMatch = responseData.match(/<ssl_token>([^<]+)<\/ssl_token>/);

      parsedResponse = {
        ssl_result: resultMatch ? resultMatch[1] : null,
        ssl_result_message: messageMatch ? messageMatch[1] : null,
        ssl_txn_id: txnIdMatch ? txnIdMatch[1] : null,
        ssl_token: tokenMatch ? tokenMatch[1] : null,
      };
    } else {
      // JSON response
      parsedResponse = responseData;
    }

    logger.info("Parsed payment response:", parsedResponse);

    const success = parsedResponse.ssl_result === "0";
    const vaultToken = parsedResponse.ssl_token;

    if (success && vaultToken) {
      logger.info("Payment successful, vault token generated:", {
        txnId: parsedResponse.ssl_txn_id,
        vaultTokenLength: vaultToken.length,
      });

      res.json({
        success: true,
        vaultToken,
        txnId: parsedResponse.ssl_txn_id,
        message:
          parsedResponse.ssl_result_message || "Payment processed successfully",
      });
    } else {
      logger.error("Payment failed:", {
        result: parsedResponse.ssl_result,
        message: parsedResponse.ssl_result_message,
      });

      res.json({
        success: false,
        message: parsedResponse.ssl_result_message || "Payment failed",
      });
    }
  } catch (error) {
    logger.error("Error processing Converge tokenize and pay:", error);
    res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again.",
      error: error.message,
    });
  }
});

// ---- Converge HPP (Hosted Payment Page) Integration ----

/**
 * @route POST /api/payment/converge-hpp/session-token
 * @desc Create Converge HPP session token for hosted payment page
 * @access Public
 */
router.post("/converge-hpp/session-token", async (req, res) => {
  try {
    const {
      amount,
      orderId,
      customerId,
      clubId,
      addToken = true,
      memberData,
    } = req.body || {};

    if (!amount || !orderId || !clubId) {
      return res.status(400).json({
        ok: false,
        error: "amount, orderId, and clubId are required",
      });
    }

    logger.info("Creating Converge HPP session token:", {
      amount,
      orderId,
      customerId,
      clubId,
      addToken,
    });

    // Get Converge processor information from database
    const convergeResult = await executeSqlProcedure(
      "procConvergeItemSelect1",
      clubId,
      [clubId]
    );

    if (!convergeResult || convergeResult.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Converge processor information not found for this club",
      });
    }

    const firstRow = convergeResult[0];
    const convergeInfo = {
      merchant_id: firstRow.merchant_id?.trim() || "",
      converge_user_id: firstRow.converge_user_id?.trim() || "",
      converge_pin: firstRow.converge_pin?.trim() || "",
      converge_url_process:
        firstRow.converge_url_process?.trim() ||
        "https://api.convergepay.com/VirtualMerchant/process.do",
    };

    if (
      !convergeInfo.merchant_id ||
      !convergeInfo.converge_user_id ||
      !convergeInfo.converge_pin
    ) {
      return res.status(400).json({
        ok: false,
        error: "Incomplete Converge processor configuration",
      });
    }

    // Create session token request with real member data
    const form = {
      ssl_merchant_id: convergeInfo.merchant_id.trim(),
      ssl_user_id: convergeInfo.converge_user_id.trim(),
      ssl_pin: convergeInfo.converge_pin.trim(),
      ssl_transaction_type: "ccsale",
      ssl_amount: amount,
      ssl_currency_code: "USD",
      ssl_invoice_number: orderId,
      ssl_get_token: addToken ? "Y" : "N",
      ssl_add_token: addToken ? "Y" : "N",
      ssl_customer_id: customerId || undefined,
      // Use real member data for AVS fields
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

    // Use the correct HPP endpoint for session tokens
    const url = "https://api.convergepay.com/hosted-payments/transaction_token";

    logger.info("Sending session token request to Converge:", {
      url,
      merchant_id: form.ssl_merchant_id,
      amount: form.ssl_amount,
      orderId: form.ssl_invoice_number,
    });

    const response = await axios.post(url, qs.stringify(form), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
      responseType: "text",
      transformResponse: [(d) => d],
    });

    logger.info(
      "Converge session token response:",
      response.data?.toString?.() || response.data
    );

    // Extract token from response
    const extractTxnToken = (raw) => {
      if (raw == null) return null;
      if (typeof raw === "string") {
        const s = raw.trim();
        const m = s.match(/ssl_txn_auth_token\s*=\s*(.+)/i);
        return (m ? m[1] : s).trim();
      }
      if (typeof raw === "object" && raw.ssl_txn_auth_token)
        return raw.ssl_txn_auth_token;
      return null;
    };

    const token = extractTxnToken(response.data);
    if (!token) {
      return res.status(502).json({
        ok: false,
        error: "Could not parse session token from Converge response",
        upstream: response.data,
      });
    }

    logger.info("Session token created successfully:", {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + "...",
    });

    return res.json({ ok: true, ssl_txn_auth_token: token });
  } catch (err) {
    const status = err?.response?.status || 500;
    const upstream = err?.response?.data;

    logger.error("Error creating Converge HPP session token:", {
      status,
      error: err.message,
      upstream: upstream || err.message,
    });

    return res.status(status).json({
      ok: false,
      error: "Converge session token request failed",
      status,
      upstream,
    });
  }
});

/**
 * @route POST /api/payment/converge-hpp/store-vault-token
 * @desc Store vault token using insert webstrcustr stored procedure
 * @access Public
 */
router.post("/converge-hpp/store-vault-token", async (req, res) => {
  try {
    const {
      customerId,
      vaultToken,
      transactionId,
      amount,
      clubId,
      memberData,
    } = req.body || {};

    if (!vaultToken || !clubId) {
      return res.status(400).json({
        ok: false,
        error: "vaultToken and clubId are required",
      });
    }

    logger.info("Storing vault token:", {
      customerId,
      vaultTokenLength: vaultToken ? vaultToken.length : 0,
      transactionId,
      amount,
      clubId,
      memberData: memberData
        ? {
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            email: memberData.email,
          }
        : null,
    });

    // Use the web_proc_InsertWebStrcustr stored procedure to store the vault token
    // This will store the token in the database for future use
    const result = await executeSqlProcedure(
      "web_proc_InsertWebStrcustr",
      clubId,
      [
        customerId || "UNKNOWN", // parCustCode
        "", // parBridgeCode
        memberData?.firstName + " " + memberData?.lastName || "", // parBusName
        "", // parCreditRep
        memberData?.phone || "", // parPhone
        memberData?.address || "", // parAddress1
        "", // parAddress2
        memberData?.city || "", // parCity
        memberData?.state || "", // parState
        memberData?.zipCode || "", // parPostCode
        new Date().toISOString().split("T")[0], // parObtainedDate (today's date)
        "", // parCcExpDate
        "", // parCardNo
        "", // parExpDate
        memberData?.firstName + " " + memberData?.lastName || "", // parCardHolder
        "CONVERGE", // parCcMethod
        "WEB_ENROLLMENT", // parCreatedBy
        "", // parSalesPersnCode
        memberData?.email || "", // parEmail
        clubId, // parClub
        transactionId || "", // parOrigPosTrans
        "", // parPin
        vaultToken, // parToken
        "", // parSpecialtyMembership
        "Y", // parNewPt
      ]
    );

    logger.info("Vault token stored successfully:", {
      customerId,
      transactionId,
      amount,
      result: result ? "success" : "no result",
    });

    return res.json({
      ok: true,
      message: "Vault token stored successfully",
      customerId,
      transactionId,
    });
  } catch (error) {
    logger.error("Error storing vault token:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: "Failed to store vault token",
      details: error.message,
    });
  }
});

/**
 * @route POST /api/payment/converge-hpp/log-payment-response
 * @desc Log payment responses for debugging and monitoring
 * @access Public
 */
router.post("/converge-hpp/log-payment-response", async (req, res) => {
  try {
    const { status, result, customerId, amount, timestamp, clubId } =
      req.body || {};

    logger.info("Converge HPP Payment Response:", {
      status,
      customerId,
      amount,
      timestamp: timestamp || new Date().toISOString(),
      resultMessage: result?.ssl_result_message,
      resultCode: result?.ssl_result,
      approvalCode: result?.ssl_approval_code,
      transactionId: result?.ssl_transaction_id,
      cardType: result?.ssl_card_type,
      last4: result?.ssl_last4,
      avsResponse: result?.ssl_avs_response,
      cvv2Response: result?.ssl_cvv2_response,
      clubId,
      fullResult: result,
    });

    return res.json({ ok: true });
  } catch (error) {
    logger.error("Error logging payment response:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: "Failed to log payment response",
    });
  }
});

/**
 * @route GET /api/payment/converge-hpp/test
 * @desc Test endpoint to verify Converge HPP integration is working
 * @access Public
 */
router.get("/converge-hpp/test", async (req, res) => {
  try {
    const clubId = req.query.clubId || "001";

    logger.info("Testing Converge HPP integration:", { clubId });

    // Test database connection and Converge info retrieval
    const convergeResult = await executeSqlProcedure(
      "procConvergeItemSelect1",
      clubId,
      [clubId]
    );

    if (!convergeResult || convergeResult.length === 0) {
      return res.json({
        ok: false,
        error: "Converge processor information not found for this club",
        clubId,
      });
    }

    const firstRow = convergeResult[0];
    const convergeInfo = {
      merchant_id: firstRow.merchant_id || "",
      converge_user_id: firstRow.converge_user_id || "",
      converge_pin: firstRow.converge_pin || "",
      converge_url_process:
        firstRow.converge_url_process || "https://api.convergepay.com",
    };

    // Check if credentials are configured
    const hasCredentials = !!(
      convergeInfo.merchant_id &&
      convergeInfo.converge_user_id &&
      convergeInfo.converge_pin
    );

    return res.json({
      ok: true,
      message: "Converge HPP integration test successful",
      clubId,
      convergeInfo: {
        merchant_id: convergeInfo.merchant_id
          ? `${convergeInfo.merchant_id.substring(0, 4)}****`
          : "Not configured",
        converge_user_id: convergeInfo.converge_user_id
          ? `${convergeInfo.converge_user_id.substring(0, 4)}****`
          : "Not configured",
        converge_pin: convergeInfo.converge_pin ? "****" : "Not configured",
        converge_url_process: convergeInfo.converge_url_process,
      },
      hasCredentials,
      endpoints: {
        sessionToken: "/api/payment/converge-hpp/session-token",
        storeVaultToken: "/api/payment/converge-hpp/store-vault-token",
        logPaymentResponse: "/api/payment/converge-hpp/log-payment-response",
      },
    });
  } catch (error) {
    logger.error("Error testing Converge HPP integration:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: "Converge HPP integration test failed",
      details: error.message,
    });
  }
});

export default router;
