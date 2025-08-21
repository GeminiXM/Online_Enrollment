import express from "express";
import fetch from "node-fetch";
import logger from "../utils/logger.js";
import { executeSqlProcedure } from "../controllers/paymentController.js";

const router = express.Router();
const CONVERGE_ENV = process.env.CONVERGE_ENV || "prod"; // "demo" or "prod"
const TOKEN_URL =
  CONVERGE_ENV === "demo"
    ? "https://api.demo.convergepay.com/hosted-payments/transaction_token"
    : "https://api.convergepay.com/hosted-payments/transaction_token";

/**
 * @desc Create a session token for Converge Lightbox
 * @route POST /api/converge/session-token
 * @access Public
 */
router.post("/session-token", async (req, res) => {
  try {
    const {
      clubId,
      amount,
      currency = "USD",
      transactionType = "ccsale",
      customerCode,
    } = req.body;

    if (!clubId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Club ID and amount are required",
      });
    }

    logger.info(
      `Creating Converge session token for club ID: ${clubId}, amount: ${amount}`
    );

    // Get Converge credentials from database
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
          merchant_id: (firstRow.merchant_id || "").trim(),
          converge_user_id: (firstRow.converge_user_id || "").trim(),
          converge_pin: (firstRow.converge_pin || "").trim(),
          converge_url_process: (firstRow.converge_url_process || "").trim(),
          converge_url_process_batch: (
            firstRow.converge_url_process_batch || ""
          ).trim(),
          converge_cvv2_indicator: (
            firstRow.converge_cvv2_indicator || ""
          ).trim(),
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

    // IMPORTANT: trim values to avoid hidden spaces from Converge UI exports
    const params = new URLSearchParams({
      ssl_merchant_id: convergeInfo.merchant_id.trim(),
      ssl_user_id: convergeInfo.converge_user_id.trim(), // must be a Hosted/API user
      ssl_pin: convergeInfo.converge_pin.trim(),
      ssl_transaction_type: transactionType, // ccsale or ccauthonly
      ssl_amount: String(amount),
      ssl_currency_code: currency,
      ssl_add_token: "Y", // store in vault
      ssl_get_token: "Y", // return ssl_token in approval response
      ...(customerCode ? { ssl_customer_code: customerCode } : {}),
    });

    logger.info("Making Converge session token request:", {
      url: TOKEN_URL,
      merchantId: convergeInfo.merchant_id.trim(),
      userId: convergeInfo.converge_user_id.trim(),
      amount,
      transactionType,
      customerCode: customerCode || "N/A",
    });

    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/x-www-form-urlencoded, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      body: params,
      redirect: "manual", // Prevent automatic redirects
    });

    logger.info("Converge session token response status:", {
      status: resp.status,
      statusText: resp.statusText,
      ok: resp.ok,
    });

    // Handle response - Converge might return JSON or HTML error page
    let data = null;
    let responseText = "";

    try {
      responseText = await resp.text();
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, it's likely an HTML error page
      logger.error("Failed to parse Converge response as JSON:", {
        status: resp.status,
        statusText: resp.statusText,
        responsePreview: responseText.substring(0, 500),
        parseError: parseError.message,
      });

      // Try to extract error message from HTML
      const errorMatch = responseText.match(/<h3><b>([^<]+)<\/b><\/h3>/);
      const errorMessage = errorMatch ? errorMatch[1] : "Unknown error";

      res.status(400).json({
        success: false,
        error: `Converge API error: ${errorMessage}`,
        status: resp.status,
        statusText: resp.statusText,
        responsePreview: responseText.substring(0, 200),
      });
      return;
    }

    logger.info("Converge session token response:", {
      hasToken: !!data.ssl_txn_auth_token,
      tokenLength: data.ssl_txn_auth_token ? data.ssl_txn_auth_token.length : 0,
      ssl_result: data.ssl_result,
      ssl_result_message: data.ssl_result_message,
    });

    if (resp.ok && data.ssl_result === "0" && data.ssl_txn_auth_token) {
      res.status(200).json({
        success: true,
        ssl_txn_auth_token: data.ssl_txn_auth_token,
        ssl_result: data.ssl_result,
        ssl_result_message: data.ssl_result_message,
        message: "Session token created successfully",
      });
    } else {
      logger.error("Converge session token error:", {
        status: resp.status,
        data: data,
      });
      res.status(400).json({
        success: false,
        error: data.ssl_result_message || "Failed to create session token",
        ssl_result: data.ssl_result,
        ssl_result_message: data.ssl_result_message,
      });
    }
  } catch (error) {
    logger.error("Error creating Converge session token:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: "Internal server error creating session token",
      message: error.message,
    });
  }
});

export default router;
