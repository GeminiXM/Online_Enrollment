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
          fluidpay_api_key: "fpkey_test_demo",
          merchant_id: `fpmerchant_${clubId}`,
        };
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
        fluidpay_api_key: "fpkey_test_fallback",
        merchant_id: `fpmerchant_fallback_${clubId}`,
      };

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
        // Provide fallback demo data
        logger.warn("No Converge info found for club, using fallback", {
          clubId,
        });
        convergeInfo = {
          merchant_id: `cvmerchant_${clubId}`,
          converge_user_id: "webuser",
          converge_pin: "12345",
          converge_url_process:
            "https://api.demo.convergepay.com/VirtualMerchantDemo/processTransaction.do",
          converge_url_process_batch:
            "https://api.demo.convergepay.com/VirtualMerchantDemo/processBatch.do",
          converge_cvv2_indicator: "1",
        };
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

      const fallbackInfo = {
        merchant_id: `cvmerchant_fallback_${clubId}`,
        converge_user_id: "webuser_fallback",
        converge_pin: "12345",
        converge_url_process:
          "https://api.demo.convergepay.com/VirtualMerchantDemo/processTransaction.do",
        converge_url_process_batch:
          "https://api.demo.convergepay.com/VirtualMerchantDemo/processBatch.do",
        converge_cvv2_indicator: "1",
      };

      res.status(200).json({
        success: true,
        convergeInfo: fallbackInfo,
        note: "Using fallback data due to procedure error",
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

    // Get the club ID from the request body
    const { clubId, amount, orderId } = req.body;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    logger.info(
      `Generating Converge token for club ID: ${clubId}, amount: ${amount}, orderId: ${orderId}`
    );

    // In a real implementation, this would call Converge's API to get a transaction token
    // For now, we'll return a mock token for development/demo purposes
    const mockToken = `demo_token_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    logger.info("Converge token generated successfully", {
      clubId,
      token: mockToken.substring(0, 20) + "...", // Don't log the full token
      isDemo: true,
    });

    res.status(200).json({
      success: true,
      ssl_txn_auth_token: mockToken,
      isDemo: true,
      message: "Demo token generated for development",
    });
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
 * @desc Get FluidPay transaction token for payment processing
 * @route POST /api/payment/fluidpay-token
 * @access Public
 */
export const getFluidPayToken = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for FluidPay transaction token");

    // Get the club ID from the request body
    const { clubId, amount, orderId } = req.body;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    logger.info(
      `Generating FluidPay token for club ID: ${clubId}, amount: ${amount}, orderId: ${orderId}`
    );

    // In a real implementation, this would call FluidPay's API to get a transaction token
    // For now, we'll return a mock token for development/demo purposes
    const mockToken = `demo_fluidpay_token_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    logger.info("FluidPay token generated successfully", {
      clubId,
      token: mockToken.substring(0, 20) + "...", // Don't log the full token
      isDemo: true,
    });

    res.status(200).json({
      success: true,
      ssl_txn_auth_token: mockToken,
      isDemo: true,
      message: "Demo FluidPay token generated for development",
    });
  } catch (error) {
    logger.error("Error in getFluidPayToken:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error generating FluidPay token",
      error: error.message,
    });
  }
};
