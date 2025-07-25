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
 * Formats expiration date from MMYY to YYYY-MM-DD format
 * @param {string} expDate - Expiration date in MMYY format (e.g., "1225")
 * @returns {string} - Formatted date in YYYY-MM-DD format
 */
const formatExpirationDate = (expDate) => {
  if (!expDate || expDate.length !== 4) return "";

  const month = expDate.substring(0, 2);
  const year = "20" + expDate.substring(2, 4);

  // Validate month and year
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2099) {
    return "";
  }

  // Return in YYYY-MM-DD format (last day of the month)
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  return `${year}-${month.padStart(2, "0")}-${lastDay
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Formats card number with proper asterisk masking
 * @param {string} last4 - Last 4 digits of the card
 * @returns {string} - Formatted card number with asterisks
 */
const formatCardNumber = (last4) => {
  if (!last4 || last4.length !== 4) return "";
  return `************${last4}`;
};

/**
 * Formats card type to proper case-sensitive values
 * @param {string} cardType - Raw card type from payment processor
 * @returns {string} - Properly formatted card type
 */
const formatCardType = (cardType) => {
  if (!cardType) return "";

  const upperCardType = cardType.toUpperCase();

  // Map common card type variations to proper format
  switch (upperCardType) {
    case "VISA":
      return "Visa";
    case "MASTERCARD":
    case "MC":
      return "MC";
    case "DISCOVER":
    case "DISC":
      return "Disc";
    case "AMERICAN EXPRESS":
    case "AMEX":
      return "AMEX";
    default:
      return cardType; // Return as-is if not recognized
  }
};

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
 * @desc Get specialty membership bridge code
 * @route GET /api/enrollment/bridge-code
 * @access Public
 */
export const getSpecialtyMembershipBridgeCode = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for specialty membership bridge code");

    // Get parameters from the query
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided
    const specialtyMembership = req.query.specialtyMembership || ""; // Default to empty string if not provided

    logger.info(
      `Fetching bridge code for club ID: ${clubId}, specialty membership: ${specialtyMembership}`
    );

    // Execute the stored procedure
    const result = await executeSqlProcedure(
      "web_proc_GetSpecialtyMembershipBridgeCode",
      clubId,
      [clubId, specialtyMembership]
    );

    // Extract the bridge code from the result
    let bridgeCode = "";
    if (result && result.length > 0) {
      const firstRow = result[0];
      if (firstRow) {
        // Check for the specialty_bridge_code field
        if (firstRow.specialty_bridge_code !== undefined) {
          bridgeCode = firstRow.specialty_bridge_code;
        } else {
          // Fallback to first property
          const firstKey = Object.keys(firstRow)[0];
          if (firstKey) {
            bridgeCode = firstRow[firstKey];
          }
        }
      }
    }

    logger.info("Bridge code retrieved successfully", {
      clubId,
      specialtyMembership,
      bridgeCode,
    });

    res.status(200).json({
      success: true,
      bridgeCode,
    });
  } catch (error) {
    logger.error("Error in getSpecialtyMembershipBridgeCode:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving bridge code",
      error: error.message,
    });
  }
};

/**
 * @desc Get tax rate for New Mexico clubs
 * @route GET /api/enrollment/tax-rate
 * @access Public
 */
export const getTaxRate = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for tax rate");

    // Get the club ID from query parameters - used only for database connection
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided

    // The club ID itself might not contain 'NM', so we can't rely on that
    // We'll get the tax rate from the database, then check in the frontend
    // if we should apply it (only for New Mexico clubs)
    logger.info(
      `Fetching tax rate using club ID ${clubId} for database connection`
    );

    // For New Mexico clubs, execute the stored procedure to get tax rate
    const result = await executeSqlProcedure("web_proc_GetTaxRate", clubId, []);

    // Extract the tax rate from the result
    let taxRate = 0.07625; // Default tax rate for New Mexico in case of failure
    if (result && result.length > 0) {
      const firstRow = result[0];
      if (firstRow) {
        // Check for the tax_rate field or first property
        if (firstRow.tax_rate !== undefined) {
          taxRate = parseFloat(firstRow.tax_rate);
        } else {
          // Fallback to first property
          const firstKey = Object.keys(firstRow)[0];
          if (firstKey) {
            taxRate = parseFloat(firstRow[firstKey]);
          }
        }
      }
    }

    logger.info("Tax rate retrieved successfully", {
      taxRate,
    });

    res.status(200).json({
      success: true,
      taxRate,
    });
  } catch (error) {
    logger.error("Error in getTaxRate:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving tax rate",
      error: error.message,
    });
  }
};

/**
 * @desc Get membership price
 * @route GET /api/enrollment/price
 * @access Public
 */
export const getMembershipPrice = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for membership price");

    // Get parameters from the query
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided
    const membershipType = req.query.membershipType || "I"; // Default to Individual if not provided
    const agreementType = req.query.agreementType || "M"; // Default to Monthly if not provided
    const specialtyMembership = req.query.specialtyMembership || ""; // Default to empty string if not provided
    const bridgeCode = req.query.bridgeCode || ""; // Default to empty string if not provided

    logger.info(
      `Fetching price for club ID: ${clubId}, membership type: ${membershipType}, agreement type: ${agreementType}, specialty membership: ${specialtyMembership}, bridge code: ${bridgeCode}`
    );

    // Execute the stored procedure
    const result = await executeSqlProcedure(
      "procInventoryDuesPriceListSelect1",
      clubId,
      [clubId, membershipType, agreementType, specialtyMembership, bridgeCode]
    );

    // Extract the price from the result
    let price = 0;
    let description = "";
    let upcCode = "";
    let taxCode = "";
    let proratedDuesUpcCode = "";
    let proratedDuesTaxable = "";

    if (result && result.length > 0) {
      const firstRow = result[0];
      if (firstRow) {
        // Extract the specific fields based on the procedure's return values
        if (firstRow.invtr_price !== undefined) {
          price = parseFloat(firstRow.invtr_price) || 0;
        }

        if (firstRow.invtr_desc !== undefined) {
          description = firstRow.invtr_desc.trim() || "";
        }

        if (firstRow.invtr_upccode !== undefined) {
          upcCode = firstRow.invtr_upccode.trim() || "";
        }

        if (firstRow.classr_tax_code !== undefined) {
          taxCode = firstRow.classr_tax_code.trim() || "";
        }

        if (firstRow.prorated_dues_upccode !== undefined) {
          proratedDuesUpcCode = firstRow.prorated_dues_upccode.trim() || "";
        }

        if (firstRow.prorated_dues_taxable !== undefined) {
          proratedDuesTaxable = firstRow.prorated_dues_taxable.trim() || "";
        }
      }
    }

    logger.info("Price retrieved successfully", {
      clubId,
      membershipType,
      agreementType,
      specialtyMembership,
      bridgeCode,
      price,
      description,
      upcCode,
      taxCode,
      proratedDuesInfo: {
        upcCode: proratedDuesUpcCode,
        taxable: proratedDuesTaxable,
      },
    });

    res.status(200).json({
      success: true,
      price,
      description,
      upcCode,
      taxCode,
      proratedDuesInfo: {
        upcCode: proratedDuesUpcCode,
        taxable: proratedDuesTaxable,
      },
    });
  } catch (error) {
    logger.error("Error in getMembershipPrice:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving price",
      error: error.message,
    });
  }
};

/**
 * @desc Submit a new enrollment form
 * @route POST /api/enrollment
 * @access Public
 */
/**
 * Converts placeholder gender values back to empty strings
 * @param {string} gender - The gender value to convert
 * @returns {string} - The converted gender value
 */
const convertGenderValue = (gender) => {
  // Convert "N" (used as placeholder) back to empty string
  return gender === "N" ? "" : gender;
};

export const submitEnrollment = async (req, res) => {
  try {
    // Log initial request
    logger.info(
      "Received enrollment submission:",
      JSON.stringify(req.body, null, 2)
    );

    const {
      firstName,
      lastName,
      middleInitial,
      dateOfBirth,
      gender,
      email,
      address,
      address2,
      city,
      state,
      zipCode,
      cellPhone,
      homePhone,
      workPhone,
      membershipType,
      specialtyMembership,
      requestedStartDate,
      club,
      familyMembers,
      guardian,
      paymentInfo, // Extract payment information
    } = req.body;

    // Extract payment data for database insertion
    const paymentData = {
      token: paymentInfo?.transactionId || "",
      cardExpDate: paymentInfo?.expirationDate
        ? formatExpirationDate(paymentInfo.expirationDate)
        : "",
      cardNumber: paymentInfo?.last4 ? formatCardNumber(paymentInfo.last4) : "",
      cardType: formatCardType(paymentInfo?.cardType || ""),
      processorName: paymentInfo?.processorName || "",
    };

    logger.info("Payment data extracted:", paymentData);

    // Log specialty membership for debugging
    logger.info("Specialty membership data:", {
      membershipType,
      specialtyMembership,
      note: "membershipType should be (I,D,F), specialtyMembership should be (J,S,Y) if applicable",
    });

    // Prepare common data - convert names to uppercase for Informix database
    const firstNameUpper = firstName.toUpperCase();
    const lastNameUpper = lastName.toUpperCase();
    const middleInitialUpper = middleInitial ? middleInitial.toUpperCase() : "";

    const busName = `${firstNameUpper} ${
      middleInitialUpper ? middleInitialUpper + ". " : ""
    }${lastNameUpper}`;

    // First, determine which phone number to use (priority: cellPhone > homePhone > workPhone)
    const phone = cellPhone || homePhone || workPhone || "";

    logger.info("Preparing membership record:", { busName, club });

    // 1. Generate a customer code
    let custCode;

    try {
      // Attempt to use the new procedure
      const nextIdResult = await executeSqlProcedure(
        "procNextMembershipId",
        club
      );

      // Log the entire result to see its structure
      logger.info(
        "Raw result from procNextMembershipId:",
        JSON.stringify(nextIdResult, null, 2)
      );

      // Access the result properly based on the procedure's output
      if (nextIdResult && nextIdResult.length > 0) {
        // Try different possible property names or get first column value
        const firstRow = nextIdResult[0];
        if (firstRow) {
          // Extract the first value from the result object
          const firstKey = Object.keys(firstRow)[0];
          if (firstKey) {
            custCode = firstRow[firstKey];
            logger.info(`Found ID using key '${firstKey}'`);
          }
        }
      }
    } catch (procedureError) {
      logger.error("Error calling procNextMembershipId:", {
        error: procedureError.message,
        stack: procedureError.stack,
      });
      // We'll fall back to the original method below
    }

    // If we couldn't get a valid customer code from the procedure, fall back to the original method
    if (!custCode) {
      logger.warn(
        "Couldn't get valid customer code from procedure, using fallback method"
      );

      // First insert with blank code
      await executeSqlProcedure("web_proc_InsertWebStrcustr", club, [
        "", // parCustCode - leaving blank for now
        "", // parBridgeCode
        busName, // parBusName (already uppercase)
        "", // parCreditRep
        phone, // parPhone
        address, // parAddress1
        address2 || "", // parAddress2
        city, // parCity
        state, // parState
        zipCode, // parPostCode
        requestedStartDate, // parObtainedDate
        "", // parCcExpDate
        "", // parCardNo
        "", // parExpDate
        "", // parCardHolder
        "", // parCcMethod
        "ONLINE", // parCreatedBy
        "ONLINE", // parSalesPersnCode
        email, // parEmail
        club, // parClub
        "", // parOrigPosTrans
        "", // parPin
        "", // parToken
        specialtyMembership || "", // parSpecialtyMembership - use specialty membership code (J, S, Y)
        "", // parNewPt
      ]);

      // Then retrieve the generated code
      const custCodeResult = await pool.query(
        club,
        `SELECT MAX(cust_code) AS cust_code FROM web_strcustr WHERE bus_name = ? AND email = ?`,
        [busName, email]
      );

      custCode = custCodeResult[0].cust_code;
      logger.info("Generated customer code using fallback method:", {
        custCode,
      });

      return res.status(200).json({
        success: true,
        message: "Enrollment submitted successfully using fallback method",
        custCode: custCode,
      });
    }

    // Ensure the cust code is properly formatted as a string
    custCode = String(custCode).trim();
    logger.info("Using customer code:", { custCode });

    // 2. Insert primary membership record using web_proc_InsertWebStrcustr
    logger.info("Inserting primary membership record:", {
      busName,
      club,
      custCode,
      paymentData,
    });

    logger.info("Payment data details:", {
      token: paymentData.token,
      cardExpDate: paymentData.cardExpDate,
      cardNumber: paymentData.cardNumber,
      cardType: paymentData.cardType,
      originalExpDate: req.body.paymentInfo?.expirationDate,
      originalCardType: req.body.paymentInfo?.cardType,
    });

    await executeSqlProcedure("web_proc_InsertWebStrcustr", club, [
      custCode, // parCustCode - using generated ID
      custCode, // parBridgeCode - using same ID for bridge code
      busName, // parBusName (already uppercase)
      "", // parCreditRep
      phone, // parPhone
      address, // parAddress1
      address2 || "", // parAddress2
      city, // parCity
      state, // parState
      zipCode, // parPostCode
      requestedStartDate, // parObtainedDate
      paymentData.cardExpDate, // parCcExpDate - from payment processor
      paymentData.cardNumber, // parCardNo - last 4 digits with asterisks
      paymentData.cardExpDate, // parExpDate - same as parCcExpDate
      "", // parCardHolder
      paymentData.cardType, // parCcMethod - card type (VISA, MC, etc.)
      "ONLINE", // parCreatedBy
      "ONLINE", // parSalesPersnCode
      email, // parEmail
      club, // parClub
      "", // parOrigPosTrans
      "", // parPin
      paymentData.token, // parToken - transaction token from payment processor
      specialtyMembership || "", // parSpecialtyMembership - use specialty membership code (J, S, Y)
      "", // parNewPt
    ]);

    logger.info("Primary membership record inserted successfully");

    // 2. Insert primary member record using web_proc_InsertWebAsamembr
    logger.info("Inserting primary member record");

    await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
      custCode, // parCustCode
      0, // parMbrCode (0 for primary)
      firstNameUpper, // parFname (uppercase)
      middleInitialUpper || "", // parMname (uppercase)
      lastNameUpper, // parLname (uppercase)
      convertGenderValue(gender), // parSex - Apply conversion here
      dateOfBirth, // parBdate
      homePhone || "", // parHomePhone
      workPhone || "", // parWorkPhone
      "", // parWorkExtension
      cellPhone || "", // parMobilePhone
      email, // parEmail
      "P", // parRole (P for primary)
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" }), // parCreatedDate - current date in YYYY-MM-DD format
    ]);

    logger.info("Primary member record inserted successfully");

    // 3. Process family members if any
    if (familyMembers && familyMembers.length > 0) {
      logger.info("Processing family members:", {
        count: familyMembers.length,
        familyMembers: familyMembers.map((m) => ({
          firstName: m.firstName,
          lastName: m.lastName,
          memberType: m.memberType,
          role: m.role,
          gender: m.gender,
          dateOfBirth: m.dateOfBirth,
        })),
      });

      // Log each family member individually for debugging
      familyMembers.forEach((member, index) => {
        logger.info(`Family member ${index + 1}:`, {
          firstName: member.firstName,
          lastName: member.lastName,
          memberType: member.memberType,
          role: member.role,
          gender: member.gender,
          dateOfBirth: member.dateOfBirth,
          // Add more detailed logging
          memberTypeCheck: member.memberType === "adult",
          roleCheck: member.role === "S",
          isAdult: member.memberType === "adult" || member.role === "S",
        });
      });

      // Track the next member code to use
      let nextMbrCode = 1;

      // Process adult members first (role = 'S')
      const adultMembers = familyMembers.filter(
        (m) => m.memberType === "adult" || m.role === "S"
      );

      logger.info("Adult members found:", {
        count: adultMembers.length,
        adultMembers: adultMembers.map((m) => ({
          firstName: m.firstName,
          lastName: m.lastName,
          memberType: m.memberType,
          role: m.role,
        })),
      });

      for (const member of adultMembers) {
        logger.info("Inserting adult family member:", {
          name: `${member.firstName} ${member.lastName}`,
        });

        await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
          custCode, // parCustCode
          nextMbrCode, // parMbrCode (Sequential)
          member.firstName.toUpperCase(), // parFname (uppercase)
          (member.middleInitial || "").toUpperCase(), // parMname (uppercase)
          member.lastName.toUpperCase(), // parLname (uppercase)
          convertGenderValue(member.gender), // parSex - Apply conversion here
          member.dateOfBirth, // parBdate
          member.homePhone || "", // parHomePhone
          member.workPhone || "", // parWorkPhone
          "", // parWorkExtension
          member.cellPhone || "", // parMobilePhone
          member.email || "", // parEmail
          "S", // parRole (S for secondary adult)
          new Date().toLocaleDateString("en-CA", {
            timeZone: "America/Denver",
          }), // parCreatedDate - current date in YYYY-MM-DD format
        ]);

        nextMbrCode++;
        logger.info("Adult family member inserted successfully");
      }

      // Then process dependent members (role = 'D')
      const dependentMembers = familyMembers.filter(
        (m) =>
          m.memberType === "child" || m.memberType === "youth" || m.role === "D"
      );

      logger.info("Dependent members found:", {
        count: dependentMembers.length,
        dependentMembers: dependentMembers.map((m) => ({
          firstName: m.firstName,
          lastName: m.lastName,
          memberType: m.memberType,
          role: m.role,
        })),
      });

      for (const member of dependentMembers) {
        logger.info("Inserting dependent family member:", {
          name: `${member.firstName} ${member.lastName}`,
          type: member.memberType,
        });

        await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
          custCode, // parCustCode
          nextMbrCode, // parMbrCode (Sequential)
          member.firstName, // parFname
          member.middleInitial || "", // parMname
          member.lastName, // parLname
          convertGenderValue(member.gender), // parSex - Apply conversion here
          member.dateOfBirth, // parBdate
          member.homePhone || "", // parHomePhone
          member.workPhone || "", // parWorkPhone
          "", // parWorkExtension
          member.cellPhone || "", // parMobilePhone
          member.email || "", // parEmail
          "D", // parRole (D for dependent)
          new Date().toLocaleDateString("en-CA", {
            timeZone: "America/Denver",
          }), // parCreatedDate - current date in YYYY-MM-DD format
        ]);

        nextMbrCode++;
        logger.info("Dependent family member inserted successfully");
      }
    } else {
      logger.info("No family members to process");
    }

    // 4. Process guardian information if present
    if (guardian) {
      logger.info("Inserting guardian:", {
        name: `${guardian.firstName} ${guardian.lastName}`,
      });

      await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
        custCode, // parCustCode
        1, // parMbrCode (1 for guardian)
        guardian.firstName.toUpperCase(), // parFname (uppercase)
        (guardian.middleInitial || "").toUpperCase(), // parMname (uppercase)
        guardian.lastName.toUpperCase(), // parLname (uppercase)
        convertGenderValue(guardian.gender), // parSex - Apply conversion here
        guardian.dateOfBirth, // parBdate
        guardian.homePhone || "", // parHomePhone
        guardian.workPhone || "", // parWorkPhone
        "", // parWorkExtension
        guardian.cellPhone || "", // parMobilePhone
        guardian.email || "", // parEmail
        "G", // parRole (G for guardian)
        new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" }), // parCreatedDate - current date in YYYY-MM-DD format
      ]);

      logger.info("Guardian inserted successfully");
    }

    // 5. Insert message information using web_proc_InsertWebAsamessag
    logger.info("Inserting message information");

    // Format the date from YYYY-MM-DD to MM/DD/YYYY
    const dateParts = requestedStartDate.split("-");
    const formattedDate =
      dateParts.length === 3
        ? `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`
        : requestedStartDate;

    // Get the monthly dues amount from the request body
    // It might be in different locations depending on the frontend implementation
    let monthlyDues = "0.00";
    if (req.body.membershipDetails && req.body.membershipDetails.price) {
      monthlyDues = req.body.membershipDetails.price.toFixed(2);
    } else if (req.body.membershipPrice) {
      monthlyDues = req.body.membershipPrice.toFixed(2);
    } else if (req.body.monthlyDues) {
      monthlyDues = req.body.monthlyDues;
    }

    // Format the message text as specified: 'Join: [requested start date] Net: [monthly dues only no additional services]'
    const messageText = `Join: ${formattedDate} Net: $${monthlyDues}`;

    await executeSqlProcedure("web_proc_InsertWebAsamessag", club, [
      custCode, // parCustCode
      messageText, // parMessageText
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" }), // parCreateDate - current date in YYYY-MM-DD format
    ]);

    logger.info("Message information inserted successfully");

    // 6. Insert contract information using web_proc_InsertWebAsacontr
    logger.info("Inserting contract information");

    // Use membership type from the request (I, D, or F)
    // This already comes properly determined from the frontend
    const membershipTypeCode = membershipType || "I"; // Default to Individual if not provided

    // Log the specialty membership type if present
    if (req.body.specialtyMembership) {
      logger.info(
        `Using specialty membership type: ${req.body.specialtyMembership}`
      );
    }

    // Calculate gross dues (total monthly payment including addons)
    let grossDues = 0;
    // Use membership price from request if available
    if (req.body.membershipDetails && req.body.membershipDetails.price) {
      grossDues = parseFloat(req.body.membershipDetails.price);
    } else if (req.body.membershipPrice) {
      grossDues = parseFloat(req.body.membershipPrice);
    } else if (req.body.monthlyDues) {
      grossDues = parseFloat(req.body.monthlyDues);
    }

    // Add service addon prices if any
    if (req.body.serviceAddons && Array.isArray(req.body.serviceAddons)) {
      req.body.serviceAddons.forEach((addon) => {
        if (addon.price) {
          grossDues += parseFloat(addon.price);
        }
      });
    }

    // Calculate net dues (just the monthly dues for the membership, no addons)
    const netDues =
      req.body.membershipDetails && req.body.membershipDetails.price
        ? parseFloat(req.body.membershipDetails.price)
        : grossDues; // Default to gross dues if no specific membership price

    await executeSqlProcedure("web_proc_InsertWebAsacontr", club, [
      custCode, // parCustCode
      membershipTypeCode, // parMbrshipType
      requestedStartDate, // parBeginDate
      grossDues.toFixed(2), // parGrossDues
      netDues.toFixed(2), // parNetDues
      requestedStartDate, // parContractEffDate
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" }), // parCreatedDate - current date in YYYY-MM-DD format
    ]);

    logger.info("Contract information inserted successfully");

    // 7. Insert receipt documents for membership dues and addons
    logger.info("Inserting receipt document for membership dues");

    // Insert receipt document for membership dues
    await executeSqlProcedure("web_proc_InsertWebAsprecdoc", club, [
      custCode, // parCustCode
      custCode, // parDocNo (use custCode for dues)
      custCode, // parBillTo
      netDues.toFixed(2), // parAmt (dues price)
      "D", // parBillable ('D' for dues)
      req.body.membershipDetails?.upcCode || "", // parUpcCode
      requestedStartDate, // parBeginDate
      req.body.membershipDetails?.description || "MONTHLY DUES", // parStmtText
      club, // parStore
      null, // parEndDate
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" }), // parCreatedDate - current date in YYYY-MM-DD format
    ]);

    logger.info("Membership dues receipt document inserted successfully");

    // Insert receipt documents for each service addon
    if (
      req.body.serviceAddons &&
      Array.isArray(req.body.serviceAddons) &&
      req.body.serviceAddons.length > 0
    ) {
      logger.info(
        `Processing ${req.body.serviceAddons.length} service addons for receipt documents`
      );

      for (const addon of req.body.serviceAddons) {
        logger.info(
          `Inserting receipt document for addon: ${addon.description}`
        );

        await executeSqlProcedure("web_proc_InsertWebAsprecdoc", club, [
          custCode, // parCustCode
          "ADDON", // parDocNo (use 'ADDON' for addons)
          custCode, // parBillTo
          parseFloat(addon.price).toFixed(2), // parAmt (addon price)
          "B", // parBillable ('B' for billable addon)
          addon.upcCode || "", // parUpcCode
          requestedStartDate, // parBeginDate
          addon.description || "", // parStmtText
          club, // parStore
          null, // parEndDate
          new Date().toLocaleDateString("en-CA", {
            timeZone: "America/Denver",
          }), // parCreatedDate - current date in YYYY-MM-DD format
        ]);

        logger.info(
          `Receipt document for addon ${addon.description} inserted successfully`
        );
      }
    }

    logger.info("Enrollment submission completed successfully");

    // 8. Call web_proc_InsertProduction to migrate to production tables
    logger.info("Calling web_proc_InsertProduction to migrate to production");

    // Get tax and prorate data from the enrollment form
    const membershipDetails = req.body.membershipDetails || {};
    const duesTaxAmount = membershipDetails.proratedTaxAmount || 0.0;

    // Calculate addon tax based on addon total and tax rate
    const taxRate = membershipDetails.taxRate || 0.0;
    const addonsTotal =
      req.body.serviceAddons && Array.isArray(req.body.serviceAddons)
        ? req.body.serviceAddons.reduce(
            (sum, addon) => sum + parseFloat(addon.price || 0),
            0
          )
        : 0.0;
    const addonsTaxAmount = Number((addonsTotal * taxRate).toFixed(2));

    const initiationFeeTax = 0.0; // Calculate based on initiation fee and tax rate
    const prorateTaxAmount = membershipDetails.proratedTaxAmount || 0.0;

    // Calculate totals from the enrollment form data
    const initiationFee = 0.0; // Get from membership details if available
    const prorateAmount = membershipDetails.proratedPrice || 0.0;

    // Get UPC codes
    const membershipUpcCode = req.body.membershipDetails?.upcCode || "";
    const addonUpcCodes =
      req.body.serviceAddons && Array.isArray(req.body.serviceAddons)
        ? req.body.serviceAddons
            .map((addon) => addon.upcCode || "")
            .filter((upc) => upc !== "")
        : [];

    logger.info("UPC codes for production migration:", {
      membershipUpcCode,
      addonUpcCodes,
      addonCount: addonUpcCodes.length,
    });

    // Calculate total tax amount
    const totalTaxAmount =
      duesTaxAmount + addonsTaxAmount + initiationFeeTax + prorateTaxAmount;

    // Extract the returned values from the procedure
    let updatedCustCode = custCode;
    let transactionId = "";
    let resultCode = 0;
    let errorMessage = "";

    try {
      // Format dates to MM/DD/YYYY format for database compatibility
      const startDateParts = requestedStartDate.split("-");
      const formattedStartDate =
        startDateParts.length === 3
          ? `${startDateParts[1]}/${startDateParts[2]}/${startDateParts[0]}`
          : requestedStartDate;

      const today = new Date();
      const formattedCreatedDate = `${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today
        .getDate()
        .toString()
        .padStart(2, "0")}/${today.getFullYear()}`;

      logger.info("About to call web_proc_InsertProduction with parameters:", {
        custCode,
        formattedStartDate,
        formattedCreatedDate,
        grossDues: grossDues.toFixed(2),
        totalTaxAmount: totalTaxAmount.toFixed(2),
        club,
        cardType: paymentData.cardType,
        cardExpDate: paymentData.cardExpDate,
        cardNumber: paymentData.cardNumber,
        netDues: netDues.toFixed(2),
        duesTaxAmount: duesTaxAmount.toFixed(2),
        addonsTotal: addonsTotal.toFixed(2),
        addonsTaxAmount: addonsTaxAmount.toFixed(2),
        initiationFee: initiationFee.toFixed(2),
        initiationFeeTax: initiationFeeTax.toFixed(2),
        prorateAmount: prorateAmount.toFixed(2),
        prorateTaxAmount: prorateTaxAmount.toFixed(2),
      });

      const productionResult = await executeSqlProcedure(
        "web_proc_InsertProduction",
        club,
        [
          custCode, // parCustCode
          formattedStartDate, // parStartDate (when membership starts) - formatted to MM/DD/YYYY
          formattedCreatedDate, // parCreatedDate - current date in MM/DD/YYYY format
          grossDues.toFixed(2), // parPrice
          totalTaxAmount.toFixed(2), // parTax (total tax from enrollment form)
          club, // parClub
          paymentData.cardType, // parCC_Issuer (formatted card type)
          paymentData.cardExpDate, // parCC_Exp (formatted expiration)
          paymentData.cardNumber, // parCC (formatted card number)
          netDues.toFixed(2), // parOrigDues
          duesTaxAmount.toFixed(2), // parDuesTax
          addonsTotal.toFixed(2), // parAddonsTotal
          addonsTaxAmount.toFixed(2), // parAddonsTax
          initiationFee.toFixed(2), // parIfee
          initiationFeeTax.toFixed(2), // parIfeeTax
          prorateAmount.toFixed(2), // parProrateAmt
          prorateTaxAmount.toFixed(2), // parProrateTax
        ]
      );

      logger.info("Production migration completed", {
        productionResult,
        productionResultType: typeof productionResult,
        productionResultLength: productionResult?.length,
        productionResultKeys:
          productionResult && productionResult.length > 0
            ? Object.keys(productionResult[0])
            : null,
      });

      if (productionResult && productionResult.length > 0) {
        const result = productionResult[0];

        // Log the entire result object to see all available properties
        logger.info("Raw production result object:", {
          result,
          resultKeys: Object.keys(result),
          resultValues: Object.values(result),
        });

        // Extract values based on the RETURN statement: result, sql_error, isam_error, error_msg, rsUpdatedCustCode, rsTrans
        // The procedure returns numbered properties: "1"=result, "2"=sql_error, "3"=isam_error, "4"=error_msg, "5"=rsUpdatedCustCode, "6"=rsTrans
        resultCode = result["1"] || result.result || 0;
        const sqlError = result["2"] || result.sql_error || 0;
        const isamError = result["3"] || result.isam_error || 0;
        errorMessage = result["4"] || result.error_msg || "";
        updatedCustCode = (result["5"] || result.rsUpdatedCustCode || custCode)
          .toString()
          .trim();
        transactionId = result["6"] || result.rsTrans || "";

        logger.info("Production procedure result details:", {
          resultCode,
          sqlError,
          isamError,
          updatedCustCode,
          transactionId,
          errorMessage,
          resultKeys: Object.keys(result),
          fullResult: result,
        });

        // Additional debugging for transaction ID
        if (!transactionId) {
          logger.warn(
            "Transaction ID is empty, checking alternative property names:",
            {
              rsTrans: result.rsTrans,
              rsTransValue: result.rsTrans,
              trans: result.trans,
              transaction: result.transaction,
              transactionId: result.transactionId,
              allKeys: Object.keys(result),
            }
          );

          // Try to find transaction ID in any property that might contain it
          for (const [key, value] of Object.entries(result)) {
            if (
              typeof value === "string" &&
              value.length > 0 &&
              (key.toLowerCase().includes("trans") ||
                key.toLowerCase().includes("tran"))
            ) {
              logger.info(
                `Found potential transaction ID in property '${key}': ${value}`
              );
              transactionId = value;
              break;
            }
          }

          // If still no transaction ID, generate a temporary one for the item inserts
          if (!transactionId) {
            logger.warn(
              "No transaction ID found in procedure result, generating temporary ID for item inserts"
            );
            transactionId = `TEMP_${Date.now()}`;
          } else {
            // Ensure transaction ID is treated as a number if it's numeric
            if (!isNaN(transactionId)) {
              transactionId = parseInt(transactionId);
            }
          }
        }
      } else {
        logger.warn("Production procedure returned no results or empty array", {
          productionResult,
          productionResultLength: productionResult?.length,
        });
      }

      if (resultCode !== 0) {
        logger.error("Production migration failed", {
          resultCode,
          errorMessage,
          custCode,
          updatedCustCode,
          transactionId,
        });
      } else {
        // Production migration successful, now insert item details with UPC codes
        logger.info(
          "Production migration successful, inserting item details with UPC codes"
        );

        // Insert membership dues item
        if (membershipUpcCode) {
          logger.info(
            "Inserting membership dues item with UPC code:",
            membershipUpcCode
          );
          await executeSqlProcedure("web_proc_InsertAsptitemd", club, [
            transactionId, // parTrans
            membershipUpcCode, // parUPC
            prorateAmount.toFixed(2), // parPrice - prorated amount
            prorateTaxAmount.toFixed(2), // parTax - prorated tax amount
            1, // parQty
          ]);
          logger.info("Membership dues item inserted successfully");
        }

        // Insert addon items
        if (req.body.serviceAddons && Array.isArray(req.body.serviceAddons)) {
          for (const addon of req.body.serviceAddons) {
            if (addon.upcCode) {
              // Calculate prorated amount and tax for this addon
              const proratedAddonPrice = Number(
                (parseFloat(addon.price) * (prorateAmount / netDues)).toFixed(2)
              );
              const proratedAddonTax = Number(
                (proratedAddonPrice * taxRate).toFixed(2)
              );

              logger.info("Inserting addon item with UPC code:", addon.upcCode);
              await executeSqlProcedure("web_proc_InsertAsptitemd", club, [
                transactionId, // parTrans
                addon.upcCode, // parUPC
                proratedAddonPrice.toFixed(2), // parPrice - prorated amount
                proratedAddonTax.toFixed(2), // parTax - prorated tax amount
                1, // parQty
              ]);
              logger.info(
                `Addon item ${
                  addon.description
                } inserted successfully with prorated price: ${proratedAddonPrice.toFixed(
                  2
                )}, prorated tax: ${proratedAddonTax.toFixed(2)}`
              );
            }
          }
        }
      }
    } catch (productionError) {
      // Check if this is the specific rstrans undefined error
      const isRstransError =
        productionError.message &&
        productionError.message.includes("rstrans") &&
        productionError.message.includes("undefined value");

      if (isRstransError) {
        logger.warn(
          "Production migration procedure has internal variable issue (rstrans undefined), continuing with enrollment",
          {
            error: productionError.message,
            custCode,
            note: "The procedure exists but needs internal variable initialization",
          }
        );
      } else {
        logger.warn(
          "Production migration procedure not available yet, continuing with enrollment",
          {
            error: productionError.message,
            custCode,
            note: "This is expected until the procedure is created in the database",
          }
        );
      }

      // Continue with enrollment even if production migration fails
      // The enrollment data is still saved in the staging tables
      updatedCustCode = custCode;
      transactionId = `TEMP_${Date.now()}`; // Generate temporary transaction ID
      resultCode = -1; // Indicate production migration not completed
      errorMessage = isRstransError
        ? "Production migration pending - procedure needs internal variable fix"
        : "Production migration pending - procedure not yet created in database";
    }

    res.status(200).json({
      success: true,
      message: "Enrollment submitted successfully",
      custCode: updatedCustCode,
      transactionId: transactionId,
      resultCode: resultCode,
      errorMessage: errorMessage,
    });
  } catch (error) {
    logger.error("Error in submitEnrollment:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error submitting enrollment",
      error: error.message,
    });
  }
};

/**
 * @desc Get addons from the database
 * @route GET /api/enrollment/addons
 * @access Public
 */
export const getAddons = async (req, res) => {
  try {
    // Log initial request
    logger.info("Received request for addons");

    // Get the club ID from the query parameters
    const clubId = req.query.clubId || "001"; // Default to "001" if not provided

    logger.info(`Fetching addons for club ID: ${clubId}`);

    // Execute the stored procedure from SQL file
    const addons = await executeSqlProcedure("web_proc_GetAddons", clubId);

    logger.info("Addons retrieved successfully", {
      count: addons.length,
      clubId,
    });

    res.status(200).json({
      success: true,
      addons,
    });
  } catch (error) {
    logger.error("Error in getAddons:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving addons",
      error: error.message,
    });
  }
};
