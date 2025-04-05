import { pool } from "../config/database.js";
import logger from "../utils/logger.js";

/**
 * @desc Submit a new enrollment form
 * @route POST /api/enrollment
 * @access Public
 */
export const submitEnrollment = async (req, res) => {
  try {
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
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "email",
      "address",
      "city",
      "state",
      "zipCode",
      "club",
      "requestedStartDate",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate club ID
    if (!club) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    // 1. Insert primary member using web_proc_InsertWebStrcustr
    const busName = `${firstName} ${
      middleInitial ? middleInitial + ". " : ""
    }${lastName}`;

    await pool.query(
      club,
      `EXECUTE PROCEDURE web_proc_InsertWebStrcustr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "", // parCustCode - leaving blank for now
        "", // parBridgeCode
        busName, // parBusName
        "", // parCreditRep
        cellPhone || "", // parPhone
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

    // 2. Insert family members if any
    if (familyMembers && familyMembers.length > 0) {
      for (const member of familyMembers) {
        await pool.query(
          club,
          `EXECUTE PROCEDURE web_proc_InsertWebAsamembr(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "", // parCustCode - leaving blank for now
            member.mbrCode, // parMbrCode
            member.firstName, // parFname
            member.middleInitial || "", // parMname
            member.lastName, // parLname
            member.gender, // parSex
            member.dateOfBirth, // parBdate
            member.homePhone || "", // parHomePhone
            member.workPhone || "", // parWorkPhone
            "", // parWorkExtension
            member.cellPhone || "", // parMobilePhone
            member.email || "", // parEmail
            member.role, // parRole
          ]
        );
      }
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully",
      data: {
        submittedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error processing enrollment submission", {
      error: error.message,
      stack: error.stack,
    });

    // Check for specific errors
    if (error.message.includes("Invalid club ID")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "An error occurred while processing your enrollment. Please try again later.",
    });
  }
};
