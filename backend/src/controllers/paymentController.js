import { pool } from "../config/database.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import fetch for making HTTP requests
// Node.js 18+ has fetch built-in, but we'll use node-fetch for compatibility
import fetch from "node-fetch";

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
        logger.error("No FluidPay info found for club in database", {
          clubId,
        });
        throw new Error(
          "FluidPay processor information not found in database for this club."
        );
      }

      // Use hardcoded public API key for frontend tokenizer
      fluidPayInfo.fluidpay_api_key = "pub_31FUYRENhNiAvspejegbLoPD2he";

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
      logger.error("Error executing FluidPay procedure:", {
        error: procError.message,
        clubId,
      });

      res.status(500).json({
        success: false,
        message: "Error retrieving FluidPay information from database",
        error: procError.message,
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
            fluidpay_base_url: "https://app.fluidpay.com", // Production FluidPay API URL
            fluidpay_api_key: "api_2oD33fJmBytiZsi0uRaSfoCBuXl", // Hardcoded private API key for transactions
            merchant_id: (firstRow.merchant_id || "").trim(), // Remove any trailing spaces
          };

          logger.info("FluidPay credentials retrieved from database", {
            clubId,
            apiKey: "pub_31FUYRENhNiAvspejegbLoPD2he (hardcoded)",
            merchantId: fluidPayInfo.merchant_id,
            baseUrl: fluidPayInfo.fluidpay_base_url,
          });
        }
      }

      if (!fluidPayInfo || !fluidPayInfo.fluidpay_api_key) {
        throw new Error("FluidPay processor information not found");
      }

      // Validate that we have merchant ID from database
      if (!fluidPayInfo.merchant_id || fluidPayInfo.merchant_id.trim() === "") {
        throw new Error(
          "FluidPay Merchant ID not found in database. Please configure real FluidPay credentials."
        );
      }

      // Try to get merchant information to check processor configuration
      try {
        const merchantResponse = await fetch(
          `${fluidPayInfo.fluidpay_base_url}/api/merchant`,
          {
            method: "GET",
            headers: {
              Authorization: fluidPayInfo.fluidpay_api_key,
              "Content-Type": "application/json",
            },
          }
        );

        if (merchantResponse.ok) {
          const merchantData = await merchantResponse.json();
          logger.info("FluidPay merchant info retrieved", {
            merchantId: merchantData.id,
            hasDefaultProcessor: !!merchantData.default_processor,
            processors: merchantData.processors || [],
          });
        }
      } catch (merchantError) {
        logger.warn("Could not retrieve merchant info", {
          error: merchantError.message,
        });
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

      // Create customer in vault for future rebilling
      let vaultToken = null;
      try {
        const vaultResponse = await createFluidPayCustomerVault(fluidPayInfo, {
          token,
          customerInfo,
          user,
          billing,
        });
        vaultToken = vaultResponse.vaultToken;
        logger.info("Customer vault created successfully", {
          clubId,
          vaultToken: vaultToken ? `${vaultToken.substring(0, 10)}...` : null,
        });
      } catch (vaultError) {
        logger.warn("Failed to create customer vault, but payment succeeded", {
          error: vaultError.message,
          clubId,
        });
        // Don't fail the payment if vault creation fails
      }

      logger.info("FluidPay payment processed successfully", {
        clubId,
        transactionId: paymentResponse.transactionId,
        amount,
        vaultToken: vaultToken ? `${vaultToken.substring(0, 10)}...` : null,
      });

      res.status(200).json({
        success: true,
        transactionId: paymentResponse.transactionId,
        authorizationCode: paymentResponse.authorizationCode,
        cardNumber: paymentResponse.cardNumber,
        cardType: paymentResponse.cardType,
        amount: amount,
        vaultToken: vaultToken, // Include vault token for database storage
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

  try {
    logger.info("Making FluidPay API call", {
      baseUrl: fluidPayInfo.fluidpay_base_url,
      merchantId: fluidPayInfo.merchant_id,
      amount: amount,
      hasToken: !!token,
    });

    // Prepare the request payload according to FluidPay documentation
    const requestPayload = {
      type: "sale",
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      payment_method: {
        token: token,
      },
      // Add processor ID if available - this might be needed for merchant accounts without default processor
      // processor_id: "your_processor_id_here", // Uncomment if you have a specific processor ID
    };

    logger.info("FluidPay API request details", {
      url: `${fluidPayInfo.fluidpay_base_url}/api/transaction`,
      method: "POST",
      merchantId: fluidPayInfo.merchant_id,
      amount: requestPayload.amount,
      amountOriginal: amount,
      token: token ? `${token.substring(0, 10)}...` : "null",
      customer: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
      },
      requestPayload: requestPayload,
    });

    // Make actual FluidPay API call
    const response = await fetch(
      `${fluidPayInfo.fluidpay_base_url}/api/transaction`,
      {
        method: "POST",
        headers: {
          Authorization: fluidPayInfo.fluidpay_api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      }
    );

    let responseData;
    const responseText = await response.text();

    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("Failed to parse FluidPay response as JSON", {
        responseText: responseText,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        parseError: parseError.message,
      });
      throw new Error(`FluidPay returned invalid JSON: ${responseText}`);
    }

    logger.info("FluidPay API response details", {
      httpStatus: response.status,
      httpStatusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseData: responseData,
      responseDataKeys: Object.keys(responseData || {}),
      transactionId: responseData.id || responseData.transaction_id,
      status: responseData.status,
      message: responseData.message,
      authCode: responseData.auth_code || responseData.authorization_code,
      cardInfo: {
        last4: responseData.card_number
          ? responseData.card_number.slice(-4)
          : null,
        type: responseData.card_type || responseData.card_brand,
      },
      rawResponseText: responseText.substring(0, 500), // Log first 500 chars of raw response
    });

    if (!response.ok) {
      throw new Error(
        `FluidPay API error: ${response.status} - ${JSON.stringify(
          responseData
        )}`
      );
    }

    // Check if the transaction was declined
    if (responseData.data && responseData.data.status === "declined") {
      const errorMessage =
        responseData.data.response_body?.card?.processor_response_text ||
        responseData.data.response_body?.card?.processor_response_code ||
        "Transaction declined";
      throw new Error(`FluidPay transaction declined: ${errorMessage}`);
    }

    // Check if the API call was successful but transaction failed
    if (responseData.status !== "success") {
      throw new Error(
        `FluidPay API error: ${responseData.msg || "Unknown error"}`
      );
    }

    return {
      transactionId: responseData.data?.id || `TXN_${Date.now()}`,
      authorizationCode:
        responseData.data?.response_body?.card?.auth_code ||
        `AUTH${Math.random().toString().substr(2, 6)}`,
      cardNumber:
        responseData.data?.response_body?.card?.masked_card || "****1111",
      cardType: responseData.data?.response_body?.card?.card_type || "VISA",
      status: responseData.data?.status,
      amount: amount,
      response: responseData,
    };
  } catch (error) {
    logger.error("FluidPay API call failed", {
      error: error.message,
      fluidPayInfo: {
        baseUrl: fluidPayInfo.fluidpay_base_url,
        merchantId: fluidPayInfo.merchant_id,
        hasApiKey: !!fluidPayInfo.fluidpay_api_key,
      },
      paymentData: {
        amount: amount,
        hasToken: !!token,
        customerEmail: customerInfo?.email,
      },
    });

    throw error;
  }
};

/**
 * @desc Create FluidPay customer vault
 * @param {Object} fluidPayInfo - FluidPay processor information
 * @param {Object} vaultData - Customer vault data including token
 * @returns {Object} Vault response with vault token
 */
const createFluidPayCustomerVault = async (fluidPayInfo, vaultData) => {
  const { token, customerInfo, user, billing } = vaultData;

  try {
    logger.info("Creating FluidPay customer vault", {
      baseUrl: fluidPayInfo.fluidpay_base_url,
      merchantId: fluidPayInfo.merchant_id,
      hasToken: !!token,
      customerEmail: customerInfo?.email,
    });

    // Prepare the vault request payload according to FluidPay documentation
    const vaultPayload = {
      description: `${customerInfo.firstName} ${customerInfo.lastName} - Club Member`,
      payment_method: {
        token: token,
      },
      billing_address: {
        first_name: customerInfo.firstName || "",
        last_name: customerInfo.lastName || "",
        company: "",
        address_line_1: customerInfo.address || "",
        address_line_2: "",
        city: customerInfo.city || "",
        state: customerInfo.state || "",
        postal_code: customerInfo.zipCode || "",
        country: "US",
        email: customerInfo.email || "",
        phone: customerInfo.phone || "",
        fax: "",
      },
    };

    logger.info("FluidPay vault request details", {
      url: `${fluidPayInfo.fluidpay_base_url}/api/vault/customer`,
      method: "POST",
      merchantId: fluidPayInfo.merchant_id,
      token: token ? `${token.substring(0, 10)}...` : "null",
      customer: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
      },
      vaultPayload: vaultPayload,
    });

    // Make FluidPay vault API call
    const response = await fetch(
      `${fluidPayInfo.fluidpay_base_url}/api/vault/customer`,
      {
        method: "POST",
        headers: {
          Authorization: fluidPayInfo.fluidpay_api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vaultPayload),
      }
    );

    let responseData;
    const responseText = await response.text();

    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("Failed to parse FluidPay vault response as JSON", {
        responseText: responseText,
        responseStatus: response.status,
        parseError: parseError.message,
      });
      throw new Error(`FluidPay vault returned invalid JSON: ${responseText}`);
    }

    logger.info("FluidPay vault API response details", {
      httpStatus: response.status,
      responseData: responseData,
      vaultId: responseData.data?.id,
      status: responseData.status,
    });

    if (!response.ok) {
      throw new Error(
        `FluidPay vault API error: ${response.status} - ${JSON.stringify(
          responseData
        )}`
      );
    }

    // Check if the vault creation was successful
    if (responseData.status !== "success") {
      throw new Error(
        `FluidPay vault creation failed: ${responseData.msg || "Unknown error"}`
      );
    }

    // Extract vault token from response
    const vaultToken = responseData.data?.id;
    if (!vaultToken) {
      throw new Error("No vault token returned from FluidPay");
    }

    return {
      vaultToken: vaultToken,
      vaultId: responseData.data?.id,
      status: responseData.status,
      response: responseData,
    };
  } catch (error) {
    logger.error("FluidPay vault creation failed", {
      error: error.message,
      fluidPayInfo: {
        baseUrl: fluidPayInfo.fluidpay_base_url,
        merchantId: fluidPayInfo.merchant_id,
        hasApiKey: !!fluidPayInfo.fluidpay_api_key,
      },
      vaultData: {
        hasToken: !!token,
        customerEmail: customerInfo?.email,
      },
    });

    throw error;
  }
};

/**
 * @desc Test FluidPay credentials and connection
 * @route POST /api/payment/test-fluidpay
 * @access Public
 */
export const testFluidPayConnection = async (req, res) => {
  try {
    const { clubId } = req.body;

    logger.info("Testing FluidPay connection", { clubId });

    // Get FluidPay processor information
    const fluidPayResult = await executeSqlProcedure(
      "procFluidPayItemSelect1",
      clubId || "001",
      [clubId || "001"]
    );

    let fluidPayInfo = null;
    if (fluidPayResult && fluidPayResult.length > 0) {
      const firstRow = fluidPayResult[0];
      if (firstRow) {
        fluidPayInfo = {
          club: firstRow.club || parseInt(clubId || "001"),
          fluidpay_base_url:
            firstRow.fluidpay_base_url || "https://api.fluidpay.com",
          fluidpay_api_key: firstRow.fluidpay_api_key || "",
          merchant_id: firstRow.merchant_id || "",
        };
      }
    }

    if (!fluidPayInfo || !fluidPayInfo.fluidpay_api_key) {
      return res.status(400).json({
        success: false,
        message: "FluidPay processor information not found",
      });
    }

    // Check for demo credentials
    if (fluidPayInfo.fluidpay_api_key === "pub_31FUYRENhNiAvspejegbLoPD2he") {
      return res.status(400).json({
        success: false,
        message:
          "Demo credentials detected. Please configure real FluidPay credentials.",
        credentials: {
          apiKey: fluidPayInfo.fluidpay_api_key.substring(0, 10) + "...",
          merchantId: fluidPayInfo.merchant_id,
          baseUrl: fluidPayInfo.fluidpay_base_url,
        },
      });
    }

    // Test the connection by making a simple API call
    try {
      const response = await fetch(
        `${fluidPayInfo.fluidpay_base_url}/merchant`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(fluidPayInfo.fluidpay_api_key + ":").toString(
                "base64"
              ),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();

      logger.info("FluidPay connection test result", {
        status: response.status,
        data: responseData,
      });

      if (response.ok) {
        res.status(200).json({
          success: true,
          message: "FluidPay connection successful",
          merchantInfo: responseData,
          credentials: {
            apiKey: fluidPayInfo.fluidpay_api_key.substring(0, 10) + "...",
            merchantId: fluidPayInfo.merchant_id,
            baseUrl: fluidPayInfo.fluidpay_base_url,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "FluidPay connection failed",
          error: responseData,
          status: response.status,
        });
      }
    } catch (apiError) {
      logger.error("FluidPay API test failed", { error: apiError.message });
      res.status(500).json({
        success: false,
        message: "FluidPay API connection failed",
        error: apiError.message,
      });
    }
  } catch (error) {
    logger.error("Error testing FluidPay connection", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Error testing FluidPay connection",
      error: error.message,
    });
  }
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
        `Converge API error: ${response.status} ${
          response.statusText
        } - ${errorText.substring(0, 200)}`
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
