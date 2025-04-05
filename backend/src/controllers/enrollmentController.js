import { pool } from "../config/database.js";
import logger from "../utils/logger.js";

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

    // 1. Insert primary membership record using web_proc_InsertWebStrcustr
    const busName = `${firstName} ${
      middleInitial ? middleInitial + ". " : ""
    }${lastName}`;

    logger.info("Inserting primary membership record:", { busName, club });

    // First, determine which phone number to use (priority: cellPhone > homePhone > workPhone)
    const phone = cellPhone || homePhone || workPhone || "";

    await pool.query(
      club,
      `EXECUTE PROCEDURE web_proc_InsertWebStrcustr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

    logger.info("Primary membership record inserted successfully");

    // Get the generated customer code
    const custCodeResult = await pool.query(
      club,
      `SELECT MAX(cust_code) AS cust_code FROM web_strcustr WHERE bus_name = ? AND email = ?`,
      [busName, email]
    );

    const custCode = custCodeResult[0].cust_code;

    logger.info("Generated customer code:", { custCode });

    // 2. Insert primary member record using web_proc_InsertWebAsamembr
    logger.info("Inserting primary member record");

    await pool.query(
      club,
      `EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

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

        await pool.query(
          club,
          `EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
          ]
        );

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

        await pool.query(
          club,
          `EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
          ]
        );

        nextMbrCode++;
        logger.info("Dependent family member inserted successfully");
      }
    }

    // 4. Process guardian information if present
    if (guardian) {
      logger.info("Inserting guardian:", {
        name: `${guardian.firstName} ${guardian.lastName}`,
      });

      await pool.query(
        club,
        `EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      logger.info("Guardian inserted successfully");
    }

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
