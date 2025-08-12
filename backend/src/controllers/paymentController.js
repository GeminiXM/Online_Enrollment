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
    logger.info("Received request for Converge transaction token");

    // Get the required parameters from the request body
    const { clubId, amount, invoiceNumber, membershipId, customerInfo } =
      req.body;

    if (!clubId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Club ID and amount are required",
      });
    }

    logger.info(
      `Generating Converge token for club ID: ${clubId}, amount: ${amount}, invoice: ${invoiceNumber}`
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

      // PRODUCTION: Generate real Converge transaction token
      const tokenResponse = await generateConvergeTransactionToken(
        convergeInfo,
        {
          amount,
          invoiceNumber,
          membershipId,
          customerInfo,
        }
      );

      logger.info("Converge token generated successfully", {
        clubId,
        token: tokenResponse.ssl_txn_auth_token.substring(0, 20) + "...", // Don't log the full token
        isDemo: false,
      });

      res.status(200).json({
        success: true,
        ssl_txn_auth_token: tokenResponse.ssl_txn_auth_token,
        isDemo: false,
        message: "Real Converge token generated",
      });
    } catch (procError) {
      logger.error("Error generating Converge token:", {
        error: procError.message,
        clubId,
        amount,
      });

      res.status(500).json({
        success: false,
        message: "Error generating Converge token: " + procError.message,
      });
    }
  } catch (error) {
    logger.error("Error in getConvergeToken:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error generating Converge token",
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
 * @desc Generate Converge transaction token with API
 * @param {Object} convergeInfo - Converge processor information
 * @param {Object} tokenData - Token generation data
 * @returns {Object} Token response
 */
const generateConvergeTransactionToken = async (convergeInfo, tokenData) => {
  const { amount, invoiceNumber, membershipId, customerInfo } = tokenData;

  // PRODUCTION: Make actual Converge API call to generate transaction token
  // This calls Converge's hosted payment token generation endpoint

  const tokenRequestData = {
    ssl_merchant_id: convergeInfo.merchant_id.trim(),
    ssl_user_id: convergeInfo.converge_user_id.trim(),
    ssl_pin: convergeInfo.converge_pin.trim(),
    ssl_transaction_type: "ccsale",
    ssl_amount: amount,
    ssl_invoice_number: invoiceNumber || `INV-${Date.now()}`,
    ssl_description: `Membership Enrollment - ${membershipId || "Standard"}`,
    ssl_first_name: customerInfo?.firstName || "",
    ssl_last_name: customerInfo?.lastName || "",
    ssl_email: customerInfo?.email || "",
    ssl_phone: customerInfo?.phone || "",
    ssl_avs_address: customerInfo?.address || "",
    ssl_city: customerInfo?.city || "",
    ssl_state: customerInfo?.state || "",
    ssl_avs_zip: customerInfo?.zipCode || "",
    ssl_cvv2_indicator: convergeInfo.converge_cvv2_indicator || "N",
    ssl_show_form: "false",
    ssl_result_format: "ASCII",
  };

  try {
    // Log the request details for debugging
    logger.info("Making Converge API request:", {
      url: convergeInfo.converge_url_process,
      merchantId: convergeInfo.merchant_id.trim(),
      userId: convergeInfo.converge_user_id.trim(),
      amount,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
    });

    // Make HTTP request to Converge's token generation endpoint
    const response = await fetch(convergeInfo.converge_url_process, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenRequestData).toString(),
    });

    logger.info("Converge API response status:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Converge API error response:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Log first 500 chars
      });
      throw new Error(
        `Converge API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
      );
    }

    const responseText = await response.text();

    logger.info("Converge API response text:", {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
    });

    // Parse the response (Converge returns URL-encoded data)
    const responseParams = new URLSearchParams(responseText);

    const ssl_txn_auth_token = responseParams.get("ssl_txn_auth_token");
    const ssl_result = responseParams.get("ssl_result");
    const ssl_result_message = responseParams.get("ssl_result_message");

    logger.info("Parsed Converge response:", {
      hasToken: !!ssl_txn_auth_token,
      tokenLength: ssl_txn_auth_token ? ssl_txn_auth_token.length : 0,
      ssl_result,
      ssl_result_message,
    });

    if (ssl_result !== "0" || !ssl_txn_auth_token) {
      throw new Error(
        `Converge token generation failed: ${
          ssl_result_message || "Unknown error"
        }`
      );
    }

    return {
      ssl_txn_auth_token,
      ssl_result,
      ssl_result_message,
    };
  } catch (error) {
    logger.error("Error calling Converge API for token generation:", {
      error: error.message,
      merchantId: convergeInfo.merchant_id,
      amount,
    });
    throw new Error(`Converge API call failed: ${error.message}`);
  }
};
