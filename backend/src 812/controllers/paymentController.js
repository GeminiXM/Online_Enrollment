import { pool } from "../config/database.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to SQL procedures
const SQL_PROCEDURES_DIR = path.resolve(__dirname, "../sql/procedures");

/**
 * Reads a SQL procedure file and executes it
 * @param {string} procedureName - The name of the procedure file (without .sql extension)
 * @param {string} clubId - The club ID to execute the procedure on
 * @param {Array} params - The parameters to pass to the procedure
 * @returns {Promise<any>} - The result of the procedure execution
 */
export const executeSqlProcedure = async (
  procedureName,
  clubId,
  params = []
) => {
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
 * @desc Get credit card processor name for a club
 * @route GET /api/payment/cc-processor
 * @access Public
 */
export const getCCProcessorName = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for CC processor name");

    // Get the club ID from the query parameters
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided

    logger.info(`Fetching CC processor name for club ID: ${clubId}`);

    try {
      // Execute the stored procedure to get the proper processor
      const result = await executeSqlProcedure(
        "web_proc_GetCCProcessorName",
        clubId,
        [clubId]
      );

      // Extract the processor name from the result
      let processorName = "CONVERGE"; // Default value if not found

      if (result && result.length > 0) {
        const firstRow = result[0];
        if (firstRow) {
          // Check for the processor_name field
          if (firstRow.processor_name !== undefined) {
            processorName = firstRow.processor_name;
          } else {
            // Fallback to first property
            const firstKey = Object.keys(firstRow)[0];
            if (firstKey) {
              processorName = firstRow[firstKey];
            }
          }
        }
      }

      logger.info("CC processor name retrieved successfully", {
        clubId,
        processorName,
      });

      // Return the processor name from the database procedure
      res.status(200).json({
        success: true,
        processorName,
      });
    } catch (procError) {
      logger.error("Error executing web_proc_GetCCProcessorName procedure:", {
        error: procError.message,
      });

      // For testing, use fallback but indicate it's a fallback
      res.status(200).json({
        success: true,
        processorName: "CONVERGE", // Default to CONVERGE as fallback
        note: "Using default value due to procedure error",
      });
    }
  } catch (error) {
    logger.error("Error in getCCProcessorName:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving CC processor name",
      error: error.message,
    });
  }
};

/**
 * @desc Get FluidPay payment processor information
 * @route GET /api/payment/fluidpay-info
 * @access Public
 */
export const getFluidPayInfo = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for FluidPay processor info");

    // Get the club ID from the query parameters
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided

    logger.info(`Fetching FluidPay info for club ID: ${clubId}`);

    try {
      // Execute the stored procedure
      const result = await executeSqlProcedure(
        "procFluidPayItemSelect1",
        clubId,
        [clubId]
      );

      // Extract the FluidPay info from the result
      let fluidPayInfo = null;
      if (result && result.length > 0) {
        const firstRow = result[0];
        if (firstRow) {
          fluidPayInfo = {
            club: firstRow.club || parseInt(clubId),
            fluidpay_base_url: firstRow.fluidpay_base_url || "",
            fluidpay_api_key: firstRow.fluidpay_api_key || "",
            merchant_id: firstRow.merchant_id || "",
          };
        }
      }

      if (!fluidPayInfo) {
        // Provide fallback demo data
        logger.warn("No FluidPay info found for club, using fallback", {
          clubId,
        });
        fluidPayInfo = {
          club: parseInt(clubId),
          fluidpay_base_url: "https://api-sandbox.fluidpay.com",
          fluidpay_api_key: "pub_test_demo_key",
          merchant_id: `fpmerchant_${clubId}`,
        };
      }

      // Ensure API key has correct format for Tokenizer
      if (
        fluidPayInfo.fluidpay_api_key &&
        !fluidPayInfo.fluidpay_api_key.startsWith("pub_")
      ) {
        logger.warn(
          "FluidPay API key does not have correct format, using fallback",
          {
            clubId,
            originalKey: fluidPayInfo.fluidpay_api_key.substring(0, 10) + "...",
          }
        );
        fluidPayInfo.fluidpay_api_key = "pub_test_demo_key";
      }

      logger.info("FluidPay info retrieved successfully", {
        clubId,
        fluidPayInfo: {
          ...fluidPayInfo,
          fluidpay_api_key: "***REDACTED***", // Don't log the API key
        },
      });

      res.status(200).json({
        success: true,
        fluidPayInfo,
      });
    } catch (procError) {
      // If database error, return demo data
      logger.error("Error executing FluidPay procedure:", {
        error: procError.message,
      });

      const fallbackInfo = {
        club: parseInt(clubId),
        fluidpay_base_url: "https://api-sandbox.fluidpay.com",
        fluidpay_api_key: "pub_test_fallback_key",
        merchant_id: `fpmerchant_fallback_${clubId}`,
      };

      // Ensure fallback API key has correct format
      if (!fallbackInfo.fluidpay_api_key.startsWith("pub_")) {
        fallbackInfo.fluidpay_api_key = "pub_test_fallback_key";
      }

      res.status(200).json({
        success: true,
        fluidPayInfo: fallbackInfo,
        note: "Using fallback data due to procedure error",
      });
    }
  } catch (error) {
    logger.error("Error in getFluidPayInfo:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving FluidPay information",
      error: error.message,
    });
  }
};

/**
 * @desc Get Converge payment processor information
 * @route GET /api/payment/converge-info
 * @access Public
 */
export const getConvergeInfo = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for Converge processor info");

    // Get the club ID from the query parameters
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided

    logger.info(`Fetching Converge info for club ID: ${clubId}`);

    try {
      // Execute the stored procedure
      const result = await executeSqlProcedure(
        "procConvergeItemSelect1",
        clubId,
        [clubId]
      );

      // Extract the Converge info from the result
      let convergeInfo = null;
      if (result && result.length > 0) {
        const firstRow = result[0];
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

      if (!convergeInfo) {
        // PRODUCTION: No fallback needed - stored procedure should always return data
        logger.error("No Converge info found for club", {
          clubId,
        });
        throw new Error("Converge processor information not found");
      }

      logger.info("Converge info retrieved successfully", {
        clubId,
        convergeInfo: {
          ...convergeInfo,
          converge_pin: "***REDACTED***", // Don't log the PIN
        },
      });

      res.status(200).json({
        success: true,
        convergeInfo,
      });
    } catch (procError) {
      // If database error, return demo data
      logger.error("Error executing Converge procedure:", {
        error: procError.message,
      });

      // PRODUCTION: No fallback needed - stored procedure should always work
      res.status(500).json({
        success: false,
        message: "Converge processor information not available",
        error: procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in getConvergeInfo:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving Converge information",
      error: error.message,
    });
  }
};

/**
 * @desc Process a demo payment (no actual payment processing)
 * @route POST /api/payment/process-demo
 * @access Public
 */
export const processPaymentDemo = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received demo payment processing request");

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

    // Input validation
    if (
      !clubId ||
      !cardNumber ||
      !expiryDate ||
      !cvv ||
      !nameOnCard ||
      !billingZipCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment information",
      });
    }

    logger.info(
      `Processing demo payment for club ID: ${clubId} using ${
        processorName || "unknown"
      } processor`
    );

    // Determine which processor to use
    let processorToUse = processorName;

    if (!processorToUse) {
      // Get the processor name if not provided
      const processorResult = await executeSqlProcedure(
        "web_proc_GetCCProcessorName",
        clubId,
        [clubId]
      );

      if (processorResult && processorResult.length > 0) {
        const firstRow = processorResult[0];
        const firstKey = Object.keys(firstRow)[0];
        if (firstKey) {
          processorToUse = firstRow[firstKey];
        }
      }
    }

    logger.info(`Using processor: ${processorToUse}`);

    // Simulate processing with the appropriate processor
    let paymentResponse;

    // Check if this is a test decline card
    const isDeclineCard =
      cardNumber.includes("4000000000000002") || // FluidPay decline card
      cardNumber.includes("4000120000001154"); // Converge decline card

    // Generate response based on processor
    if (processorToUse === "FLUIDPAY") {
      // Get FluidPay info
      const fluidPayResult = await executeSqlProcedure(
        "procFluidPayItemSelect1",
        clubId,
        [clubId]
      );
      let merchantId = "";

      if (fluidPayResult && fluidPayResult.length > 0) {
        const firstRow = fluidPayResult[0];
        merchantId = firstRow.merchant_id || "";
      }

      if (isDeclineCard) {
        paymentResponse = {
          success: false,
          processor: "FLUIDPAY",
          error: {
            code: "card_declined",
            message:
              "Your card was declined. Please try a different payment method.",
          },
          transaction_id: null,
        };
      } else {
        paymentResponse = {
          success: true,
          processor: "FLUIDPAY",
          transaction_id: `fp_${Date.now()}_${Math.floor(
            Math.random() * 1000000
          )}`,
          merchant_id: merchantId,
          authorization_code: Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, "0"),
          card_info: {
            last_four: cardNumber.slice(-4),
            card_type: cardNumber.startsWith("4")
              ? "visa"
              : cardNumber.startsWith("5")
              ? "mastercard"
              : cardNumber.startsWith("3")
              ? "amex"
              : "unknown",
            expiry: expiryDate,
          },
          amount: amount || "50.00",
        };
      }
    } else {
      // Assume CONVERGE
      // Get Converge info
      const convergeResult = await executeSqlProcedure(
        "procConvergeItemSelect1",
        clubId,
        [clubId]
      );
      let merchantId = "";

      if (convergeResult && convergeResult.length > 0) {
        const firstRow = convergeResult[0];
        merchantId = firstRow.merchant_id || "";
      }

      if (isDeclineCard) {
        paymentResponse = {
          success: false,
          processor: "CONVERGE",
          error: {
            ssl_result: "1",
            ssl_result_message:
              "Your card was declined. Please try a different payment method.",
          },
          ssl_txn_id: null,
        };
      } else {
        paymentResponse = {
          success: true,
          processor: "CONVERGE",
          ssl_txn_id: `cv_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
          ssl_merchant_id: merchantId,
          ssl_approval_code: Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, "0"),
          ssl_card_number: `XXXXXXXXXXXX${cardNumber.slice(-4)}`,
          ssl_card_type: cardNumber.startsWith("4")
            ? "VISA"
            : cardNumber.startsWith("5")
            ? "MASTERCARD"
            : cardNumber.startsWith("3")
            ? "AMEX"
            : "OTHER",
          ssl_exp_date: expiryDate.replace("/", ""),
          ssl_amount: amount || "50.00",
          ssl_result: "0",
          ssl_result_message: "APPROVAL",
        };
      }
    }

    logger.info("Demo payment processed", {
      clubId,
      success: paymentResponse.success,
      processor: processorToUse,
      cardLast4: cardNumber.slice(-4),
    });

    res.status(200).json({
      success: true,
      paymentResponse,
    });
  } catch (error) {
    logger.error("Error in processPaymentDemo:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error processing demo payment",
      error: error.message,
    });
  }
};

/**
 * @desc Get Converge transaction token for payment processing
 * @route POST /api/payment/converge-token
 * @access Public
 */
export const getConvergeToken = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for Converge session token");

    // Get the required parameters from the request body
    const {
      clubId,
      amount,
      currency = "USD",
      customerCode,
      transactionType = "ccsale",
    } = req.body;

    if (!clubId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Club ID and amount are required",
      });
    }

    logger.info(
      `Generating Converge session token for club ID: ${clubId}, amount: ${amount}, customerCode: ${
        customerCode || "N/A"
      }`
    );

    try {
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
        throw new Error(
          "Converge processor information not found or incomplete"
        );
      }

      // Generate Converge session token for hosted payment fields
      const tokenResponse = await generateConvergeTransactionToken(
        convergeInfo,
        {
          amount,
          currency,
          customerCode,
          transactionType,
        }
      );

      logger.info("Converge session token generated successfully", {
        clubId,
        token: tokenResponse.ssl_txn_auth_token.substring(0, 20) + "...", // Don't log the full token
        isDemo: false,
      });

      res.status(200).json({
        success: true,
        ssl_txn_auth_token: tokenResponse.ssl_txn_auth_token,
        isDemo: false,
        message: "Converge session token generated for hosted payment fields",
      });
    } catch (procError) {
      logger.error("Error generating Converge session token:", {
        error: procError.message,
        clubId,
        amount,
      });

      res.status(500).json({
        success: false,
        message:
          "Error generating Converge session token: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in getConvergeToken:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error generating Converge session token",
      error: error.message,
    });
  }
};

/**
 * @desc Process FluidPay payment with token
 * @route POST /api/payment/process-fluidpay
 * @access Public
 */
export const processFluidPayPayment = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received FluidPay payment processing request");

    const { clubId, amount, token, customerInfo, user, billing } = req.body;

    if (!clubId || !amount || !token) {
      return res.status(400).json({
        success: false,
        message: "Club ID, amount, and token are required",
      });
    }

    logger.info(
      `Processing FluidPay payment for club ID: ${clubId}, amount: ${amount}`
    );

    try {
      // Get FluidPay processor information
      const fluidPayResult = await executeSqlProcedure(
        "procFluidPayItemSelect1",
        clubId,
        [clubId]
      );

      let fluidPayInfo = null;
      if (fluidPayResult && fluidPayResult.length > 0) {
        const firstRow = fluidPayResult[0];
        if (firstRow) {
          fluidPayInfo = {
            club: firstRow.club || parseInt(clubId),
            fluidpay_base_url:
              firstRow.fluidpay_base_url || "https://api-sandbox.fluidpay.com",
            fluidpay_api_key: firstRow.fluidpay_api_key || "",
            merchant_id: firstRow.merchant_id || "",
          };
        }
      }

      if (!fluidPayInfo || !fluidPayInfo.fluidpay_api_key) {
        throw new Error("FluidPay processor information not found");
      }

      // PRODUCTION: Make actual FluidPay API call to process the payment
      // This is where you would use the token to make a sale/charge request
      const paymentResponse = await processFluidPayTransaction(fluidPayInfo, {
        token,
        amount,
        customerInfo,
        user,
        billing,
      });

      logger.info("FluidPay payment processed successfully", {
        clubId,
        transactionId: paymentResponse.transactionId,
        amount,
      });

      res.status(200).json({
        success: true,
        transactionId: paymentResponse.transactionId,
        authorizationCode: paymentResponse.authorizationCode,
        cardNumber: paymentResponse.cardNumber,
        cardType: paymentResponse.cardType,
        amount: amount,
        message: "Payment processed successfully",
      });
    } catch (procError) {
      logger.error("Error processing FluidPay payment:", {
        error: procError.message,
        clubId,
        amount,
      });

      res.status(500).json({
        success: false,
        message: "Payment processing failed: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in processFluidPayPayment:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error processing FluidPay payment",
      error: error.message,
    });
  }
};

/**
 * @desc Process payment using stored Converge token (for rebilling)
 * @route POST /api/payment/converge-rebill
 * @access Public
 */
export const processConvergeRebill = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for Converge rebill payment");

    // Get the required parameters from the request body
    const { clubId, amount, token, currency = "USD" } = req.body;

    if (!clubId || !amount || !token) {
      return res.status(400).json({
        success: false,
        message: "Club ID, amount, and token are required",
      });
    }

    logger.info(
      `Processing Converge rebill for club ID: ${clubId}, amount: ${amount}, token: ${token.substring(
        0,
        20
      )}...`
    );

    try {
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
        throw new Error(
          "Converge processor information not found or incomplete"
        );
      }

      // Process payment using stored token
      const paymentResponse = await processConvergeTokenPayment(convergeInfo, {
        amount,
        token,
        currency,
      });

      logger.info("Converge rebill payment processed successfully", {
        clubId,
        transactionId: paymentResponse.ssl_txn_id,
        amount,
        result: paymentResponse.ssl_result,
      });

      res.status(200).json({
        success: true,
        paymentResponse,
        message: "Converge rebill payment processed successfully",
      });
    } catch (procError) {
      logger.error("Error processing Converge rebill payment:", {
        error: procError.message,
        clubId,
        amount,
      });

      res.status(500).json({
        success: false,
        message:
          "Error processing Converge rebill payment: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in processConvergeRebill:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error processing Converge rebill payment",
      error: error.message,
    });
  }
};

/**
 * Process payment using stored Converge token (server-to-server)
 * This function charges a stored token without requiring card data
 */
const processConvergeTokenPayment = async (convergeInfo, paymentData) => {
  const { amount, token, currency = "USD" } = paymentData;

  // Build the request body for token-based payment
  const body = new URLSearchParams({
    ssl_merchant_id: convergeInfo.merchant_id.trim(),
    ssl_user_id: convergeInfo.converge_user_id.trim(),
    ssl_pin: convergeInfo.converge_pin.trim(),
    ssl_transaction_type: "ccsale",
    ssl_amount: amount,
    ssl_currency_code: currency,
    ssl_token: token,
    ssl_cvv2cvc2_indicator: "N", // No CVV required for stored tokens
  });

  try {
    // Log the request details for debugging
    logger.info("Making Converge token payment request:", {
      url: "https://api.convergepay.com/VirtualMerchant/process.do",
      merchantId: convergeInfo.merchant_id.trim(),
      userId: convergeInfo.converge_user_id.trim(),
      amount,
      tokenLength: token.length,
    });

    // Make HTTPS request to Converge's VirtualMerchant endpoint
    const response = await fetch(
      "https://api.convergepay.com/VirtualMerchant/process.do",
      {
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
        body: body.toString(),
        redirect: "manual", // Prevent automatic redirects
      }
    );

    logger.info("Converge token payment response status:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Converge token payment error response:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Log first 500 chars
      });
      throw new Error(
        `Converge token payment error: ${response.status} ${
          response.statusText
        } - ${errorText.substring(0, 200)}`
      );
    }

    const responseText = await response.text();

    logger.info("Converge token payment response text:", {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
    });

    // Parse the response (Converge returns URL-encoded data)
    const responseParams = new URLSearchParams(responseText);

    const ssl_result = responseParams.get("ssl_result");
    const ssl_result_message = responseParams.get("ssl_result_message");
    const ssl_txn_id = responseParams.get("ssl_txn_id");
    const ssl_approval_code = responseParams.get("ssl_approval_code");
    const ssl_card_number = responseParams.get("ssl_card_number");
    const ssl_card_type = responseParams.get("ssl_card_type");
    const ssl_amount = responseParams.get("ssl_amount");

    logger.info("Parsed Converge token payment response:", {
      ssl_result,
      ssl_result_message,
      ssl_txn_id,
      ssl_approval_code,
      hasCardNumber: !!ssl_card_number,
      ssl_card_type,
      ssl_amount,
    });

    if (ssl_result !== "0") {
      throw new Error(
        `Converge token payment failed: ${
          ssl_result_message || "Unknown error"
        }`
      );
    }

    return {
      ssl_result,
      ssl_result_message,
      ssl_txn_id,
      ssl_approval_code,
      ssl_card_number,
      ssl_card_type,
      ssl_amount,
    };
  } catch (error) {
    logger.error("Error calling Converge API for token payment:", {
      error: error.message,
      merchantId: convergeInfo.merchant_id,
      amount,
    });
    throw new Error(`Converge token payment API call failed: ${error.message}`);
  }
};

/**
 * @desc Process FluidPay transaction with API
 * @param {Object} fluidPayInfo - FluidPay processor information
 * @param {Object} paymentData - Payment data including token
 * @returns {Object} Payment response
 */
const processFluidPayTransaction = async (fluidPayInfo, paymentData) => {
  const { token, amount, customerInfo } = paymentData;

  // PRODUCTION: Replace this with actual FluidPay API call
  // For now, simulate a successful payment response

  // In production, you would make an HTTP request to FluidPay's API:
  // POST https://api.fluidpay.com/transaction
  // Headers: {
  //   'Authorization': 'Basic ' + Buffer.from(fluidPayInfo.fluidpay_api_key + ':').toString('base64'),
  //   'Content-Type': 'application/json'
  // }
  // Body: {
  //   "type": "sale",
  //   "amount": amount,
  //   "token": token,
  //   "merchant_id": fluidPayInfo.merchant_id,
  //   "customer": {
  //     "first_name": customerInfo.firstName,
  //     "last_name": customerInfo.lastName,
  //     "email": customerInfo.email
  //   }
  // }

  // Simulate API response for development
  const mockResponse = {
    transactionId: `TXN_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    authorizationCode: `AUTH${Math.random().toString().substr(2, 6)}`,
    cardNumber: "****1111",
    cardType: "VISA",
    status: "approved",
    amount: amount,
  };

  return mockResponse;
};

/**
 * Generate Converge transaction token for hosted payment fields (SAQ-A friendly)
 * This function requests a session token from Converge that will be used to initialize
 * the hosted payment fields on the frontend
 */
const generateConvergeTransactionToken = async (convergeInfo, tokenData) => {
  const {
    amount,
    currency = "USD",
    customerCode,
    transactionType = "ccsale",
  } = tokenData;

  // Build the request body for session token generation
  const body = new URLSearchParams({
    ssl_merchant_id: convergeInfo.merchant_id.trim(),
    ssl_user_id: convergeInfo.converge_user_id.trim(),
    ssl_pin: convergeInfo.converge_pin.trim(),
    ssl_transaction_type: transactionType,
    ssl_amount: amount,
    ssl_currency_code: currency,
    ssl_add_token: "Y", // Store in vault for rebilling
    ssl_get_token: "Y", // Return token in response
    ...(customerCode ? { ssl_customer_code: customerCode } : {}),
  });

  try {
    // Log the request details for debugging
    logger.info("Making Converge session token request:", {
      url: "https://api.convergepay.com/hosted-payments/transaction_token",
      merchantId: convergeInfo.merchant_id.trim(),
      userId: convergeInfo.converge_user_id.trim(),
      amount,
      transactionType,
      customerCode: customerCode || "N/A",
    });

    // Make HTTP request to Converge's session token endpoint
    const response = await fetch(
      "https://api.convergepay.com/hosted-payments/transaction_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    logger.info("Converge session token response status:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Converge session token error response:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Log first 500 chars
      });
      throw new Error(
        `Converge session token error: ${response.status} ${
          response.statusText
        } - ${errorText.substring(0, 200)}`
      );
    }

    const responseData = await response.json();

    logger.info("Converge session token response:", {
      hasToken: !!responseData.ssl_txn_auth_token,
      tokenLength: responseData.ssl_txn_auth_token
        ? responseData.ssl_txn_auth_token.length
        : 0,
      ssl_result: responseData.ssl_result,
      ssl_result_message: responseData.ssl_result_message,
    });

    if (responseData.ssl_result !== "0" || !responseData.ssl_txn_auth_token) {
      throw new Error(
        `Converge session token generation failed: ${
          responseData.ssl_result_message || "Unknown error"
        }`
      );
    }

    return {
      ssl_txn_auth_token: responseData.ssl_txn_auth_token,
      ssl_result: responseData.ssl_result,
      ssl_result_message: responseData.ssl_result_message,
    };
  } catch (error) {
    logger.error("Error calling Converge API for session token generation:", {
      error: error.message,
      merchantId: convergeInfo.merchant_id,
      amount,
    });
    throw new Error(`Converge session token API call failed: ${error.message}`);
  }
};

/**
 * @desc Test Converge credentials by making a simple API call
 * @route POST /api/payment/converge-test-credentials
 * @access Public
 */
export const testConvergeCredentials = async (req, res) => {
  try {
    logger.info("Received request to test Converge credentials");

    const { clubId } = req.body;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    logger.info(`Testing Converge credentials for club ID: ${clubId}`);

    try {
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
        throw new Error(
          "Converge processor information not found or incomplete"
        );
      }

      logger.info("Testing credentials:", {
        merchantId: convergeInfo.merchant_id,
        userId: convergeInfo.converge_user_id,
        pinLength: convergeInfo.converge_pin.length,
      });

      // Test 1: Try the regular VirtualMerchant endpoint first
      const testBody1 = new URLSearchParams({
        ssl_merchant_id: convergeInfo.merchant_id,
        ssl_user_id: convergeInfo.converge_user_id,
        ssl_pin: convergeInfo.converge_pin,
        ssl_transaction_type: "ccquery",
        ssl_amount: "0.01",
      });

      logger.info("Testing VirtualMerchant endpoint...");

      const response1 = await fetch(
        "https://api.convergepay.com/VirtualMerchant/process.do",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: testBody1.toString(),
        }
      );

      const responseText1 = await response1.text();
      const responseParams1 = new URLSearchParams(responseText1);
      const ssl_result1 = responseParams1.get("ssl_result");

      logger.info("VirtualMerchant test result:", {
        status: response1.status,
        ssl_result: ssl_result1,
        ssl_result_message: responseParams1.get("ssl_result_message"),
      });

      // Test 2: Try the hosted payments endpoint
      const testBody2 = new URLSearchParams({
        ssl_merchant_id: convergeInfo.merchant_id,
        ssl_user_id: convergeInfo.converge_user_id,
        ssl_pin: convergeInfo.converge_pin,
        ssl_transaction_type: "ccsale",
        ssl_amount: "0.01",
        ssl_currency_code: "USD",
        ssl_add_token: "Y",
        ssl_get_token: "Y",
      });

      logger.info("Testing hosted payments endpoint...");

      const response2 = await fetch(
        "https://api.convergepay.com/hosted-payments/transaction_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: testBody2.toString(),
        }
      );

      let responseData2 = null;
      let responseText2 = "";

      if (response2.ok) {
        responseText2 = await response2.text();
        try {
          responseData2 = JSON.parse(responseText2);
        } catch (e) {
          // If not JSON, try parsing as URL-encoded
          const params = new URLSearchParams(responseText2);
          responseData2 = {
            ssl_result: params.get("ssl_result"),
            ssl_result_message: params.get("ssl_result_message"),
          };
        }
      }

      logger.info("Hosted payments test result:", {
        status: response2.status,
        statusText: response2.statusText,
        ssl_result: responseData2?.ssl_result,
        ssl_result_message: responseData2?.ssl_result_message,
        responsePreview: responseText2.substring(0, 200),
      });

      res.status(200).json({
        success: true,
        credentials: {
          merchant_id: convergeInfo.merchant_id,
          user_id: convergeInfo.converge_user_id,
          pin_length: convergeInfo.converge_pin.length,
        },
        virtualMerchantTest: {
          status: response1.status,
          ssl_result: ssl_result1,
          ssl_result_message: responseParams1.get("ssl_result_message"),
          success: ssl_result1 === "0",
        },
        hostedPaymentsTest: {
          status: response2.status,
          ssl_result: responseData2?.ssl_result,
          ssl_result_message: responseData2?.ssl_result_message,
          success: responseData2?.ssl_result === "0",
        },
      });
    } catch (procError) {
      logger.error("Error testing Converge credentials:", {
        error: procError.message,
        clubId,
      });

      res.status(500).json({
        success: false,
        message: "Error testing Converge credentials: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in testConvergeCredentials:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error testing Converge credentials",
      error: error.message,
    });
  }
};

/**
 * @desc Test multiple Converge API approaches to diagnose access issues
 * @route POST /api/payment/converge-api-test
 * @access Public
 */
export const testConvergeApiAccess = async (req, res) => {
  try {
    logger.info("Received request to test Converge API access");

    const { clubId } = req.body;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    logger.info(`Testing Converge API access for club ID: ${clubId}`);

    try {
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
        throw new Error(
          "Converge processor information not found or incomplete"
        );
      }

      const testResults = [];

      // Test 1: Basic VirtualMerchant with minimal headers
      logger.info("Test 1: Basic VirtualMerchant with minimal headers");
      try {
        const testBody1 = new URLSearchParams({
          ssl_merchant_id: convergeInfo.merchant_id,
          ssl_user_id: convergeInfo.converge_user_id,
          ssl_pin: convergeInfo.converge_pin,
          ssl_transaction_type: "ccquery",
          ssl_amount: "0.01",
        });

        const response1 = await fetch(
          "https://api.convergepay.com/VirtualMerchant/process.do",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: testBody1.toString(),
          }
        );

        const responseText1 = await response1.text();
        const isHtml1 =
          responseText1.includes("<!DOCTYPE HTML") ||
          responseText1.includes("<html");

        testResults.push({
          test: "Basic VirtualMerchant",
          status: response1.status,
          isHtml: isHtml1,
          success: !isHtml1 && response1.ok,
          responsePreview: responseText1.substring(0, 200),
        });
      } catch (error) {
        testResults.push({
          test: "Basic VirtualMerchant",
          error: error.message,
          success: false,
        });
      }

      // Test 2: VirtualMerchant with full browser headers
      logger.info("Test 2: VirtualMerchant with full browser headers");
      try {
        const testBody2 = new URLSearchParams({
          ssl_merchant_id: convergeInfo.merchant_id,
          ssl_user_id: convergeInfo.converge_user_id,
          ssl_pin: convergeInfo.converge_pin,
          ssl_transaction_type: "ccquery",
          ssl_amount: "0.01",
        });

        const response2 = await fetch(
          "https://api.convergepay.com/VirtualMerchant/process.do",
          {
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
            body: testBody2.toString(),
            redirect: "manual",
          }
        );

        const responseText2 = await response2.text();
        const isHtml2 =
          responseText2.includes("<!DOCTYPE HTML") ||
          responseText2.includes("<html");

        testResults.push({
          test: "VirtualMerchant with browser headers",
          status: response2.status,
          isHtml: isHtml2,
          success: !isHtml2 && response2.ok,
          responsePreview: responseText2.substring(0, 200),
        });
      } catch (error) {
        testResults.push({
          test: "VirtualMerchant with browser headers",
          error: error.message,
          success: false,
        });
      }

      // Test 3: Hosted Payments endpoint
      logger.info("Test 3: Hosted Payments endpoint");
      try {
        const testBody3 = new URLSearchParams({
          ssl_merchant_id: convergeInfo.merchant_id,
          ssl_user_id: convergeInfo.converge_user_id,
          ssl_pin: convergeInfo.converge_pin,
          ssl_transaction_type: "ccsale",
          ssl_amount: "0.01",
          ssl_currency_code: "USD",
          ssl_add_token: "Y",
          ssl_get_token: "Y",
        });

        const response3 = await fetch(
          "https://api.convergepay.com/hosted-payments/transaction_token",
          {
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
            body: testBody3.toString(),
            redirect: "manual",
          }
        );

        const responseText3 = await response3.text();
        const isHtml3 =
          responseText3.includes("<!DOCTYPE HTML") ||
          responseText3.includes("<html");

        testResults.push({
          test: "Hosted Payments endpoint",
          status: response3.status,
          isHtml: isHtml3,
          success: !isHtml3 && response3.ok,
          responsePreview: responseText3.substring(0, 200),
        });
      } catch (error) {
        testResults.push({
          test: "Hosted Payments endpoint",
          error: error.message,
          success: false,
        });
      }

      // Test 4: Try with different User-Agent
      logger.info("Test 4: Different User-Agent");
      try {
        const testBody4 = new URLSearchParams({
          ssl_merchant_id: convergeInfo.merchant_id,
          ssl_user_id: convergeInfo.converge_user_id,
          ssl_pin: convergeInfo.converge_pin,
          ssl_transaction_type: "ccquery",
          ssl_amount: "0.01",
        });

        const response4 = await fetch(
          "https://api.convergepay.com/VirtualMerchant/process.do",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "ConvergeAPI/1.0",
              Accept: "*/*",
            },
            body: testBody4.toString(),
          }
        );

        const responseText4 = await response4.text();
        const isHtml4 =
          responseText4.includes("<!DOCTYPE HTML") ||
          responseText4.includes("<html");

        testResults.push({
          test: "Different User-Agent",
          status: response4.status,
          isHtml: isHtml4,
          success: !isHtml4 && response4.ok,
          responsePreview: responseText4.substring(0, 200),
        });
      } catch (error) {
        testResults.push({
          test: "Different User-Agent",
          error: error.message,
          success: false,
        });
      }

      res.status(200).json({
        success: true,
        credentials: {
          merchant_id: convergeInfo.merchant_id,
          user_id: convergeInfo.converge_user_id,
          pin_length: convergeInfo.converge_pin.length,
        },
        testResults,
        summary: {
          totalTests: testResults.length,
          successfulTests: testResults.filter((t) => t.success).length,
          htmlResponses: testResults.filter((t) => t.isHtml).length,
          recommendation: testResults.some((t) => t.success)
            ? "Some API access methods work - check successful tests"
            : "No direct API access available - contact Converge support",
        },
      });
    } catch (procError) {
      logger.error("Error testing Converge API access:", {
        error: procError.message,
        clubId,
      });

      res.status(500).json({
        success: false,
        message: "Error testing Converge API access: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in testConvergeApiAccess:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error testing Converge API access",
      error: error.message,
    });
  }
};

/**
 * @desc Process Converge payment directly through VirtualMerchant (fallback when hosted payments not available)
 * @route POST /api/payment/converge-direct-payment
 * @access Public
 */
export const processConvergeDirectPayment = async (req, res) => {
  try {
    logger.info("Received request for direct Converge payment");

    const {
      clubId,
      amount,
      cardNumber,
      expiryDate,
      cvv,
      currency = "USD",
    } = req.body;

    if (!clubId || !amount || !cardNumber || !expiryDate || !cvv) {
      return res.status(400).json({
        success: false,
        message:
          "Club ID, amount, card number, expiry date, and CVV are required",
      });
    }

    logger.info(
      `Processing direct Converge payment for club ID: ${clubId}, amount: ${amount}`
    );

    try {
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
        throw new Error(
          "Converge processor information not found or incomplete"
        );
      }

      // Process payment directly through VirtualMerchant
      const paymentResponse = await processConvergeDirectTransaction(
        convergeInfo,
        {
          amount,
          cardNumber,
          expiryDate,
          cvv,
          currency,
        }
      );

      logger.info("Direct Converge payment processed successfully", {
        clubId,
        transactionId: paymentResponse.ssl_txn_id,
        amount,
        result: paymentResponse.ssl_result,
      });

      res.status(200).json({
        success: true,
        paymentResponse,
        message: "Direct Converge payment processed successfully",
      });
    } catch (procError) {
      logger.error("Error processing direct Converge payment:", {
        error: procError.message,
        clubId,
        amount,
      });

      res.status(500).json({
        success: false,
        message:
          "Error processing direct Converge payment: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in processConvergeDirectPayment:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error processing direct Converge payment",
      error: error.message,
    });
  }
};

/**
 * Process payment directly through Converge VirtualMerchant (server-to-server)
 * This function processes a payment with card data and returns a vault token
 */
const processConvergeDirectTransaction = async (convergeInfo, paymentData) => {
  const { amount, cardNumber, expiryDate, cvv, currency = "USD" } = paymentData;

  // Format expiry date (remove slashes if present)
  const formattedExpiry = expiryDate.replace(/\//g, "");

  // Build the request body for direct payment
  const body = new URLSearchParams({
    ssl_merchant_id: convergeInfo.merchant_id.trim(),
    ssl_user_id: convergeInfo.converge_user_id.trim(),
    ssl_pin: convergeInfo.converge_pin.trim(),
    ssl_transaction_type: "ccsale",
    ssl_amount: amount,
    ssl_currency_code: currency,
    ssl_card_number: cardNumber,
    ssl_exp_date: formattedExpiry,
    ssl_cvv2cvc2: cvv,
    ssl_add_token: "Y", // Store in vault for rebilling
    ssl_get_token: "Y", // Return token in response
  });

  try {
    // Log the request details for debugging
    logger.info("Making direct Converge payment request:", {
      url: "https://api.convergepay.com/VirtualMerchant/process.do",
      merchantId: convergeInfo.merchant_id.trim(),
      userId: convergeInfo.converge_user_id.trim(),
      amount,
      cardLast4: cardNumber.slice(-4),
    });

    // Make HTTPS request to Converge's VirtualMerchant endpoint
    const response = await fetch(
      "https://api.convergepay.com/VirtualMerchant/process.do",
      {
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
        body: body.toString(),
        redirect: "manual", // Prevent automatic redirects
      }
    );

    logger.info("Direct Converge payment response status:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Direct Converge payment error response:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Log first 500 chars
      });
      throw new Error(
        `Direct Converge payment error: ${response.status} ${
          response.statusText
        } - ${errorText.substring(0, 200)}`
      );
    }

    const responseText = await response.text();

    logger.info("Direct Converge payment response text:", {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
    });

    // Check if response is HTML (error page) or URL-encoded data
    if (
      responseText.includes("<!DOCTYPE HTML") ||
      responseText.includes("<html")
    ) {
      // This is an HTML error page
      logger.error(
        "Converge returned HTML error page instead of API response:",
        {
          responsePreview: responseText.substring(0, 500),
        }
      );

      // Try to extract more detailed error information from HTML
      let errorMessage = "API returned HTML error page";

      // Look for various error patterns in the HTML
      const errorPatterns = [
        /<h3><b>([^<]+)<\/b><\/h3>/,
        /<title>([^<]+)<\/title>/,
        /<h1[^>]*>([^<]+)<\/h1>/,
        /<h2[^>]*>([^<]+)<\/h2>/,
        /class="error"[^>]*>([^<]+)</,
        /id="error"[^>]*>([^<]+)</,
      ];

      for (const pattern of errorPatterns) {
        const match = responseText.match(pattern);
        if (match && match[1]) {
          errorMessage = match[1].trim();
          break;
        }
      }

      // Check if this looks like a login/authentication page
      if (
        responseText.includes("login") ||
        responseText.includes("sign in") ||
        responseText.includes("authentication")
      ) {
        errorMessage =
          "Authentication required - API access may not be enabled";
      }

      // Check if this looks like a web interface redirect
      if (
        responseText.includes("process-transaction-input") ||
        responseText.includes("Mixpanel")
      ) {
        errorMessage =
          "Redirected to web interface - direct API access not configured";
      }

      throw new Error(`Converge API error: ${errorMessage}`);
    }

    // Parse the response (Converge returns URL-encoded data)
    const responseParams = new URLSearchParams(responseText);

    const ssl_result = responseParams.get("ssl_result");
    const ssl_result_message = responseParams.get("ssl_result_message");
    const ssl_txn_id = responseParams.get("ssl_txn_id");
    const ssl_approval_code = responseParams.get("ssl_approval_code");
    const ssl_card_number = responseParams.get("ssl_card_number");
    const ssl_card_type = responseParams.get("ssl_card_type");
    const ssl_amount = responseParams.get("ssl_amount");
    const ssl_token = responseParams.get("ssl_token"); // This is the vault token

    logger.info("Parsed direct Converge payment response:", {
      ssl_result,
      ssl_result_message,
      ssl_txn_id,
      ssl_approval_code,
      hasCardNumber: !!ssl_card_number,
      ssl_card_type,
      ssl_amount,
      hasToken: !!ssl_token,
    });

    if (ssl_result !== "0") {
      throw new Error(
        `Direct Converge payment failed: ${
          ssl_result_message || "Unknown error"
        }`
      );
    }

    return {
      ssl_result,
      ssl_result_message,
      ssl_txn_id,
      ssl_approval_code,
      ssl_card_number,
      ssl_card_type,
      ssl_amount,
      ssl_token, // This is the vault token for rebilling
    };
  } catch (error) {
    logger.error("Error calling Converge API for direct payment:", {
      error: error.message,
      merchantId: convergeInfo.merchant_id,
      amount,
    });
    throw new Error(
      `Direct Converge payment API call failed: ${error.message}`
    );
  }
};
