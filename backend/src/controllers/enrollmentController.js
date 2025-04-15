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
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract procedure name from the file (assumes format "execute procedure NAME(params)")
    const procedureNameMatch = fileContent.match(/execute\s+procedure\s+([^\s(]+)/i);
    
    if (!procedureNameMatch) {
      throw new Error(`Could not parse procedure name from file: ${procedureName}.sql`);
    }
    
    const actualProcedureName = procedureNameMatch[1];
    
    // Log the procedure execution
    logger.info(`Executing SQL procedure: ${actualProcedureName}`, {
      club: clubId,
      params: params.map(p => typeof p === 'string' ? p.substring(0, 20) : p)
    });
    
    // Execute the procedure
    const query = `EXECUTE PROCEDURE ${actualProcedureName}(${Array(params.length).fill('?').join(', ')})`;
    return await pool.query(clubId, query, params);
  } catch (error) {
    logger.error(`Error executing SQL procedure: ${procedureName}`, {
      error: error.message,
      stack: error.stack
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

    logger.info(`Fetching bridge code for club ID: ${clubId}, specialty membership: ${specialtyMembership}`);

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
      bridgeCode
    });

    res.status(200).json({
      success: true,
      bridgeCode
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

    logger.info(`Fetching price for club ID: ${clubId}, membership type: ${membershipType}, agreement type: ${agreementType}, specialty membership: ${specialtyMembership}, bridge code: ${bridgeCode}`);

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
        taxable: proratedDuesTaxable
      }
    });

    res.status(200).json({
      success: true,
      price,
      description,
      upcCode,
      taxCode,
      proratedDuesInfo: {
        upcCode: proratedDuesUpcCode,
        taxable: proratedDuesTaxable
      }
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
      requestedStartDate,
      club,
      familyMembers,
      guardian,
    } = req.body;

    // Check for required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "address",
      "city",
      "state",
      "zipCode",
      "email",
      "dateOfBirth",
      "gender",
      "requestedStartDate",
      "club",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      logger.warn("Missing required fields:", missingFields);
      return res.status(400).json({
        error: "Missing required fields",
        missingFields,
        receivedFields: Object.keys(req.body),
        validationDetails: {
          firstName: !!firstName,
          lastName: !!lastName,
          address: !!address,
          city: !!city,
          state: !!state,
          zipCode: !!zipCode,
          email: !!email,
          dateOfBirth: !!dateOfBirth,
          gender: !!gender,
          requestedStartDate: !!requestedStartDate,
          club: !!club,
        },
      });
    }

    // Validate club ID
    if (!club || !/^\d{3}$/.test(club)) {
      logger.warn("Invalid club ID:", { club, type: typeof club });
      return res.status(400).json({
        error: "Invalid club ID format",
        details: {
          club,
          type: typeof club,
          length: club ? club.length : 0,
          isValid: club ? /^\d{3}$/.test(club) : false,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn("Invalid email format:", email);
      return res.status(400).json({
        error: "Invalid email format",
        details: {
          email,
          isValid: emailRegex.test(email),
        },
      });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth) || !dateRegex.test(requestedStartDate)) {
      logger.warn("Invalid date format:", { dateOfBirth, requestedStartDate });
      return res.status(400).json({
        error: "Invalid date format",
        details: {
          dateOfBirth: {
            value: dateOfBirth,
            isValid: dateRegex.test(dateOfBirth),
          },
          requestedStartDate: {
            value: requestedStartDate,
            isValid: dateRegex.test(requestedStartDate),
          },
        },
      });
    }

    // Validate that at least one phone number is provided
    if (!cellPhone && !homePhone && !workPhone) {
      logger.warn("No phone numbers provided");
      return res.status(400).json({
        error: "At least one phone number is required",
        details: {
          cellPhone,
          homePhone,
          workPhone,
        },
      });
    }

    // Validate family members if present
    if (familyMembers && familyMembers.length > 0) {
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];

        // Check required fields for each member
        const memberRequiredFields = [
          "firstName",
          "lastName",
          "dateOfBirth",
          "gender",
        ];
        const missingMemberFields = memberRequiredFields.filter(
          (field) => !member[field]
        );

        if (missingMemberFields.length > 0) {
          logger.warn("Missing required fields for family member:", {
            index: i,
            member: `${member.firstName || ""} ${member.lastName || ""}`,
            missingFields: missingMemberFields,
          });

          return res.status(400).json({
            error: `Missing required fields for family member ${i + 1}`,
            missingFields: missingMemberFields,
            member: `${member.firstName || ""} ${member.lastName || ""}`,
          });
        }

        // Validate member date format
        if (!dateRegex.test(member.dateOfBirth)) {
          logger.warn("Invalid date format for family member:", {
            index: i,
            member: `${member.firstName} ${member.lastName}`,
            dateOfBirth: member.dateOfBirth,
          });

          return res.status(400).json({
            error: `Invalid date format for family member ${i + 1}`,
            member: `${member.firstName} ${member.lastName}`,
            dateOfBirth: member.dateOfBirth,
          });
        }
      }
    }

    // Validate guardian if present (for junior memberships)
    if (guardian) {
      const guardianRequiredFields = [
        "firstName",
        "lastName",
        "dateOfBirth",
        "gender",
        "email",
      ];
      const missingGuardianFields = guardianRequiredFields.filter(
        (field) => !guardian[field]
      );

      if (missingGuardianFields.length > 0) {
        logger.warn("Missing required fields for guardian:", {
          missingFields: missingGuardianFields,
        });

        return res.status(400).json({
          error: "Missing required fields for guardian",
          missingFields: missingGuardianFields,
        });
      }

      // Validate guardian date format
      if (!dateRegex.test(guardian.dateOfBirth)) {
        logger.warn("Invalid date format for guardian:", {
          dateOfBirth: guardian.dateOfBirth,
        });

        return res.status(400).json({
          error: "Invalid date format for guardian",
          dateOfBirth: guardian.dateOfBirth,
        });
      }

      // Validate guardian email
      if (!emailRegex.test(guardian.email)) {
        logger.warn("Invalid email format for guardian:", {
          email: guardian.email,
        });

        return res.status(400).json({
          error: "Invalid email format for guardian",
          email: guardian.email,
        });
      }
    }

    // Log family members data if present
    if (familyMembers) {
      logger.info("Family members data:", {
        count: familyMembers.length,
        members: familyMembers.map((m) => ({
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          memberType: m.memberType,
        })),
      });
    }

    // Log guardian data if present
    if (guardian) {
      logger.info("Guardian data:", {
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        relationship: guardian.relationship,
      });
    }

    // Prepare common data
    const busName = `${firstName} ${
      middleInitial ? middleInitial + ". " : ""
    }${lastName}`;

    // First, determine which phone number to use (priority: cellPhone > homePhone > workPhone)
    const phone = cellPhone || homePhone || workPhone || "";

    logger.info("Preparing membership record:", { busName, club });

    // 1. Generate a customer code
    let custCode;
    
    try {
      // Attempt to use the new procedure
      const nextIdResult = await executeSqlProcedure("procNextMembershipId", club);
      
      // Log the entire result to see its structure
      logger.info("Raw result from procNextMembershipId:", 
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
        stack: procedureError.stack
      });
      // We'll fall back to the original method below
    }
    
    // If we couldn't get a valid customer code from the procedure, fall back to the original method
    if (!custCode) {
      logger.warn("Couldn't get valid customer code from procedure, using fallback method");
      
      // First insert with blank code
      await executeSqlProcedure("web_proc_InsertWebStrcustr", club, [
          "", // parCustCode - leaving blank for now
          "", // parBridgeCode
          busName, // parBusName
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
          membershipType || "", // parSpecialtyMembership
          "", // parNewPt
      ]);
      
      // Then retrieve the generated code
      const custCodeResult = await pool.query(
        club,
        `SELECT MAX(cust_code) AS cust_code FROM web_strcustr WHERE bus_name = ? AND email = ?`,
        [busName, email]
      );
      
      custCode = custCodeResult[0].cust_code;
      logger.info("Generated customer code using fallback method:", { custCode });
      
      return res.status(200).json({
        success: true,
        message: "Enrollment submitted successfully using fallback method",
        custCode: custCode
      });
    }
    
    // Ensure the cust code is properly formatted as a string
    custCode = String(custCode).trim();
    logger.info("Using customer code:", { custCode });

    // 2. Insert primary membership record using web_proc_InsertWebStrcustr
    logger.info("Inserting primary membership record:", { busName, club, custCode });

    await executeSqlProcedure("web_proc_InsertWebStrcustr", club, [
        custCode, // parCustCode - using generated ID
        custCode, // parBridgeCode - using same ID for bridge code
        busName, // parBusName
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
        membershipType || "", // parSpecialtyMembership
        "", // parNewPt
    ]);

    logger.info("Primary membership record inserted successfully");

    // 2. Insert primary member record using web_proc_InsertWebAsamembr
    logger.info("Inserting primary member record");

    await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
        custCode, // parCustCode
        0, // parMbrCode (0 for primary)
        firstName, // parFname
        middleInitial || "", // parMname
        lastName, // parLname
        convertGenderValue(gender), // parSex - Apply conversion here
        dateOfBirth, // parBdate
        homePhone || "", // parHomePhone
        workPhone || "", // parWorkPhone
        "", // parWorkExtension
        cellPhone || "", // parMobilePhone
        email, // parEmail
        "P", // parRole (P for primary)
    ]);

    logger.info("Primary member record inserted successfully");

    // 3. Process family members if any
    if (familyMembers && familyMembers.length > 0) {
      logger.info("Processing family members:", {
        count: familyMembers.length,
      });

      // Track the next member code to use
      let nextMbrCode = 1;

      // Process adult members first (role = 'S')
      const adultMembers = familyMembers.filter(
        (m) => m.memberType === "adult" || m.role === "S"
      );
      for (const member of adultMembers) {
        logger.info("Inserting adult family member:", {
          name: `${member.firstName} ${member.lastName}`,
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
            "S", // parRole (S for secondary adult)
        ]);

        nextMbrCode++;
        logger.info("Adult family member inserted successfully");
      }

      // Then process dependent members (role = 'D')
      const dependentMembers = familyMembers.filter(
        (m) =>
          m.memberType === "child" || m.memberType === "youth" || m.role === "D"
      );

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
        ]);

        nextMbrCode++;
        logger.info("Dependent family member inserted successfully");
      }
    }

    // 4. Process guardian information if present
    if (guardian) {
      logger.info("Inserting guardian:", {
        name: `${guardian.firstName} ${guardian.lastName}`,
      });

      await executeSqlProcedure("web_proc_InsertWebAsamembr", club, [
          custCode, // parCustCode
          1, // parMbrCode (1 for guardian)
          guardian.firstName, // parFname
          guardian.middleInitial || "", // parMname
          guardian.lastName, // parLname
          convertGenderValue(guardian.gender), // parSex - Apply conversion here
          guardian.dateOfBirth, // parBdate
          guardian.homePhone || "", // parHomePhone
          guardian.workPhone || "", // parWorkPhone
          "", // parWorkExtension
          guardian.cellPhone || "", // parMobilePhone
          guardian.email || "", // parEmail
          "G", // parRole (G for guardian)
      ]);

      logger.info("Guardian inserted successfully");
    }

    // 5. Insert message information using web_proc_InsertWebAsamessag
    logger.info("Inserting message information");
    
    // Format the date from YYYY-MM-DD to MM/DD/YYYY
    const dateParts = requestedStartDate.split('-');
    const formattedDate = dateParts.length === 3 ? 
        `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}` : 
        requestedStartDate;
    
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
        requestedStartDate // parCreateDate
    ]);

    logger.info("Message information inserted successfully");

    logger.info("Enrollment submission completed successfully");
    res.status(200).json({
      success: true,
      message: "Enrollment submitted successfully",
      custCode: custCode,
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
