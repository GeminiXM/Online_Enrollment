// backend/src/routes/enrollmentRoutes.js
// This file contains API routes for handling gym membership enrollment.
// It includes endpoints for submitting enrollment forms and retrieving enrollment data.

import express from "express";
import { body, validationResult } from "express-validator";
import logger from "../utils/logger.js";
import {
  submitEnrollment,
  getAddons,
  getPTPackage,
  getSpecialtyMembershipBridgeCode,
  getMembershipPrice,
  getTaxRate,
} from "../controllers/enrollmentController.js";
import { pool } from "../config/database.js";
import emailService from "../services/emailService.js";
import errorNotificationService from "../services/errorNotificationService.js";

const router = express.Router();

// In-memory storage for drafts (in production, use a database)
const draftStorage = new Map();

/**
 * @route POST /api/enrollment/draft
 * @desc Save enrollment draft
 * @access Public
 */
router.post("/draft", async (req, res) => {
  try {
    const { sessionId, formData, additionalData, timestamp } = req.body;

    if (!sessionId || !formData) {
      return res.status(400).json({
        success: false,
        message: "Session ID and form data are required",
      });
    }

    // Store draft in memory (in production, save to database)
    draftStorage.set(sessionId, {
      sessionId,
      formData,
      additionalData: additionalData || {},
      timestamp,
      createdAt: new Date(),
    });

    // Clean up old drafts (older than 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    for (const [key, draft] of draftStorage.entries()) {
      if (now - draft.timestamp > maxAge) {
        draftStorage.delete(key);
      }
    }

    logger.info("Draft saved successfully", { sessionId });

    return res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      sessionId,
    });
  } catch (error) {
    logger.error("Error saving draft", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while saving the draft",
    });
  }
});

/**
 * @route GET /api/enrollment/draft/:sessionId
 * @desc Retrieve enrollment draft
 * @access Public
 */
router.get("/draft/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const draft = draftStorage.get(sessionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    // Check if draft is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - draft.timestamp > maxAge) {
      draftStorage.delete(sessionId);
      return res.status(404).json({
        success: false,
        message: "Draft has expired",
      });
    }

    logger.info("Draft retrieved successfully", { sessionId });

    return res.status(200).json({
      success: true,
      draft: {
        sessionId: draft.sessionId,
        formData: draft.formData,
        additionalData: draft.additionalData,
        timestamp: draft.timestamp,
      },
    });
  } catch (error) {
    logger.error("Error retrieving draft", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the draft",
    });
  }
});

/**
 * @route DELETE /api/enrollment/draft/:sessionId
 * @desc Delete enrollment draft
 * @access Public
 */
router.delete("/draft/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const deleted = draftStorage.delete(sessionId);

    if (deleted) {
      logger.info("Draft deleted successfully", { sessionId });
      return res.status(200).json({
        success: true,
        message: "Draft deleted successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }
  } catch (error) {
    logger.error("Error deleting draft", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the draft",
    });
  }
});

/**
 * Validation middleware for enrollment form data
 */
const validateEnrollmentData = [
  // Primary member information validation
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("zipCode")
    .trim()
    .notEmpty()
    .withMessage("ZIP code is required")
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Invalid ZIP code format"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("dateOfBirth")
    .trim()
    .notEmpty()
    .withMessage("Date of birth is required")
    .isDate()
    .withMessage("Invalid date format"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("requestedStartDate")
    .trim()
    .notEmpty()
    .withMessage("Requested start date is required")
    .isDate()
    .withMessage("Invalid date format")
    .custom((value) => {
      const selectedDate = new Date(value);
      const today = new Date();
      // Reset time to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        throw new Error(
          "Start date cannot be in the past. Please select today or a future date."
        );
      }
      return true;
    }),
  body("club").trim().notEmpty().withMessage("Club is required"),

  // Optional fields with validation if provided
  body("cellPhone")
    .optional({ checkFalsy: true })
    .matches(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)
    .withMessage("Invalid cell phone format"),
  body("homePhone")
    .optional({ checkFalsy: true })
    .matches(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)
    .withMessage("Invalid home phone format"),
  body("workPhone")
    .optional({ checkFalsy: true })
    .matches(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)
    .withMessage("Invalid work phone format"),

  // Family members validation
  body("familyMembers")
    .optional()
    .isArray()
    .withMessage("Family members must be an array"),
  body("familyMembers.*.firstName")
    .if(body("familyMembers").exists())
    .trim()
    .notEmpty()
    .withMessage("Family member first name is required"),
  body("familyMembers.*.lastName")
    .if(body("familyMembers").exists())
    .trim()
    .notEmpty()
    .withMessage("Family member last name is required"),
  body("familyMembers.*.dateOfBirth")
    .if(body("familyMembers").exists())
    .trim()
    .notEmpty()
    .withMessage("Family member date of birth is required")
    .isDate()
    .withMessage("Invalid family member date format"),
  body("familyMembers.*.gender")
    .if(body("familyMembers").exists())
    .trim()
    .notEmpty()
    .withMessage("Family member gender is required"),
  body("familyMembers.*.role")
    .if(body("familyMembers").exists())
    .trim()
    .notEmpty()
    .withMessage("Family member role is required")
    .isIn(["P", "S", "D"])
    .withMessage(
      "Family member role must be either 'P' (primary), 'S' (secondary) or 'D' (dependent)"
    ),
];

/**
 * @route POST /api/enrollment
 * @desc Submit a new enrollment form
 * @access Public
 */
router.post(
  "/",
  /* validateEnrollmentData, */ async (req, res) => {
    try {
      // Log the received data for debugging
      logger.info("Received enrollment submission data:", {
        body: req.body,
        headers: req.headers,
        contentType: req.get("Content-Type"),
      });

      // Call the controller to handle the submission
      return await submitEnrollment(req, res);
    } catch (error) {
      logger.error("Error in enrollment route", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        message:
          "An error occurred while processing your enrollment. Please try again later.",
      });
    }
  }
);

/**
 * @route GET /api/enrollment/status/:id
 * @desc Get the status of an enrollment by ID
 * @access Public
 */
router.get("/status/:id", async (req, res) => {
  try {
    const enrollmentId = req.params.id;

    // TODO: In a real application, you would:
    // 1. Connect to your Informix database
    // 2. Query the status of the enrollment using the ID
    // 3. Return the appropriate status

    // For now, we'll just return a simulated status
    return res.status(200).json({
      success: true,
      data: {
        enrollmentId,
        status: "pending", // Could be 'pending', 'approved', 'rejected'
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error retrieving enrollment status", {
      error: error.message,
      enrollmentId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the enrollment status.",
    });
  }
});

/**
 * @route GET /api/enrollment/test-connection/:clubId
 * @desc Test database connection for a specific club
 * @access Public
 */
router.get("/test-connection/:clubId", async (req, res) => {
  try {
    const { clubId } = req.params;

    // Try to get a connection
    const conn = await pool.getConnection(clubId);

    // If we get here, connection was successful
    conn.close();

    return res.status(200).json({
      success: true,
      message: `Successfully connected to database for club ${clubId}`,
    });
  } catch (error) {
    logger.error("Error testing database connection", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route GET /api/enrollment/addons
 * @desc Get addons from the database
 * @access Public
 */
router.get("/addons", async (req, res) => {
  try {
    return await getAddons(req, res);
  } catch (error) {
    logger.error("Error in addons route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while retrieving addons. Please try again later.",
    });
  }
});

/**
 * @route GET /api/enrollment/pt-package
 * @desc Get Personal Training package from the database
 * @access Public
 */
router.get("/pt-package", async (req, res) => {
  try {
    return await getPTPackage(req, res);
  } catch (error) {
    logger.error("Error in pt-package route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while retrieving the PT package. Please try again later.",
    });
  }
});

/**
 * @route GET /api/enrollment/bridge-code
 * @desc Get specialty membership bridge code
 * @access Public
 */
router.get("/bridge-code", async (req, res) => {
  try {
    return await getSpecialtyMembershipBridgeCode(req, res);
  } catch (error) {
    logger.error("Error in bridge-code route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while retrieving the bridge code. Please try again later.",
    });
  }
});

/**
 * @route GET /api/enrollment/price
 * @desc Get membership price
 * @access Public
 */
router.get("/price", async (req, res) => {
  try {
    return await getMembershipPrice(req, res);
  } catch (error) {
    logger.error("Error in price route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while retrieving the membership price. Please try again later.",
    });
  }
});

/**
 * @route GET /api/enrollment/tax-rate
 * @desc Get tax rate for a specific club
 * @access Public
 */
router.get("/tax-rate", async (req, res) => {
  try {
    return await getTaxRate(req, res);
  } catch (error) {
    logger.error("Error in tax-rate route", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while retrieving the tax rate. Please try again later.",
    });
  }
});

/**
 * @route POST /api/enrollment/save-contract
 * @desc Save contract PDF to contracts folder
 * @access Public
 * @deprecated Contract saving is now handled in EnrollmentConfirmation.jsx
 */
router.post("/save-contract", async (req, res) => {
  // Contract saving is now handled in EnrollmentConfirmation.jsx with proper naming
  return res.status(200).json({
    success: true,
    message: "Contract saving is now handled in EnrollmentConfirmation.jsx",
  });
});

// Send welcome email with contract attachment
router.post("/send-welcome-email", async (req, res) => {
  try {
    const {
      membershipNumber,
      firstName,
      lastName,
      email,
      selectedClub,
      transactionId,
      amountBilled,
      formData: actualFormData,
      contractPDF,
    } = req.body;

    if (!membershipNumber || !email) {
      return res.status(400).json({
        success: false,
        message: "Membership number and email are required",
      });
    }

    // Create enrollment data for email using the real transaction ID and amount
    const enrollmentData = {
      custCode: membershipNumber,
      transactionId: transactionId || `TXN${Date.now()}`, // Use real transaction ID if available
      amountBilled: amountBilled || 0, // Use the actual amount billed from frontend
    };

    // Use the actual form data from frontend; fall back to minimal shape
    const formData = actualFormData || {
      firstName,
      lastName,
      email,
      membershipType: "Individual Membership",
      club: selectedClub?.name || "Wellbridge",
      requestedStartDate: new Date().toLocaleDateString(),
      monthlyDues: 0,
    };

    // Best-effort lookup of sales rep email if a sales rep (emp code) was selected but no email was provided
    try {
      const hasSalesRepEmpCode =
        formData?.salesRep && String(formData.salesRep).trim().length > 0;
      const hasSalesRepEmail =
        formData?.salesRepEmail ||
        formData?.salesRep?.email ||
        formData?.salesRepEmailAddress;
      const clubIdForLookup = (selectedClub?.id || "")
        .toString()
        .padStart(3, "0");
      if (!hasSalesRepEmail && hasSalesRepEmpCode && clubIdForLookup) {
        const reps = await pool.query(
          clubIdForLookup,
          "EXECUTE PROCEDURE web_proc_GetSalesReps(?)",
          [clubIdForLookup]
        );
        if (Array.isArray(reps) && reps.length > 0) {
          const match = reps.find((row) => {
            const code = (row.emp_code || row.EMP_CODE || "").toString().trim();
            return code === String(formData.salesRep).trim();
          });
          if (match) {
            const repEmail =
              match.sales_rep_email || match.email || match.emp_email || null;
            if (repEmail) {
              formData.salesRepEmail = repEmail;
            }
          }
        }
      }
    } catch (repLookupErr) {
      logger.warn("Sales rep email lookup failed (non-blocking)", {
        error: repLookupErr.message,
        salesRep: formData?.salesRep,
        clubId: selectedClub?.id,
      });
    }

    // Convert contractPDF array back to buffer if provided
    let contractPDFBuffer = null;
    if (contractPDF && Array.isArray(contractPDF)) {
      contractPDFBuffer = Buffer.from(contractPDF);
    }

    // Send welcome email with contract attachment
    const emailSent = await emailService.sendWelcomeEmail(
      enrollmentData,
      formData,
      {}, // signatureData (not needed for email)
      contractPDFBuffer, // Use the provided contract PDF buffer
      selectedClub
    );

    if (emailSent) {
      // Fire-and-forget internal notifications; do not fail overall on these
      try {
        await emailService.sendInternalNewMemberNotification(
          enrollmentData,
          formData,
          selectedClub
        );
      } catch (internalErr) {
        logger.error("Failed to send GM internal new member notification", {
          error: internalErr?.message,
          membershipNumber,
        });
      }

      // If PT was purchased, notify PT manager and regional PT manager
      try {
        const ptPurchased = !!formData?.hasPTAddon || !!formData?.ptPackage;
        if (ptPurchased) {
          await emailService.sendInternalPTPurchaseNotification(
            enrollmentData,
            formData,
            selectedClub
          );
        }
      } catch (ptErr) {
        logger.error("Failed to send PT internal notification", {
          error: ptErr?.message,
          membershipNumber,
        });
      }

      logger.info("Welcome email sent successfully from confirmation page:", {
        membershipNumber,
        email,
      });
      return res.status(200).json({
        success: true,
        message: "Welcome email sent successfully",
      });
    } else {
      logger.error("Failed to send welcome email from confirmation page:", {
        membershipNumber,
        email,
      });
      return res.status(500).json({
        success: false,
        message: "Failed to send welcome email",
      });
    }
  } catch (error) {
    logger.error("Error sending welcome email from confirmation page:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred while sending the welcome email",
      error: error.message,
    });
  }
});

// Send contract email route
router.post("/send-contract-email", async (req, res) => {
  try {
    const {
      formData,
      signatureData,
      initialedSections,
      membershipNumber,
      clubId,
      email,
      contractPDF,
    } = req.body;

    if (
      !formData ||
      !signatureData ||
      !initialedSections ||
      !membershipNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required data: formData, signatureData, initialedSections, and membershipNumber are required",
      });
    }

    // Create enrollment data object
    const enrollmentData = {
      custCode: membershipNumber,
      transactionId: `PRETEND_${Date.now()}`,
      amountBilled: formData.amountBilled || 0,
    };

    // Get club information
    let selectedClub = null;
    if (clubId) {
      try {
        const [clubRows] = await pool.query(
          "SELECT * FROM clubs WHERE id = ?",
          [clubId]
        );
        if (clubRows.length > 0) {
          selectedClub = clubRows[0];
        }
      } catch (error) {
        logger.error("Error fetching club information:", error);
      }
    }

    // Use the provided PDF buffer or create a mock one if not provided
    let pdfBuffer;
    if (contractPDF && Array.isArray(contractPDF)) {
      // Convert array back to Buffer
      pdfBuffer = Buffer.from(contractPDF);
    } else {
      // Create a mock PDF buffer for the contract
      pdfBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Membership Contract) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF\n",
        "binary"
      );
    }

    const emailSent = await emailService.sendWelcomeEmail(
      enrollmentData,
      formData,
      signatureData,
      pdfBuffer,
      selectedClub
    );

    if (emailSent) {
      logger.info("Contract email sent successfully", {
        membershipNumber,
        email: formData.email,
        clubId,
      });
      res.status(200).json({
        success: true,
        message: "Contract email sent successfully",
      });
    } else {
      logger.error("Failed to send contract email", {
        membershipNumber,
        email: formData.email,
        clubId,
      });
      res.status(500).json({
        success: false,
        message: "Failed to send contract email",
      });
    }
  } catch (error) {
    logger.error("Error sending contract email:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error sending contract email",
      error: error.message,
    });
  }
});

// Test email route (for development only)
router.post("/test-email", async (req, res) => {
  try {
    const testData = {
      custCode: "TEST123456",
      transactionId: "TXN789012",
      amountBilled: 99.99,
    };

    const testFormData = {
      firstName: "John",
      lastName: "Doe",
      email: "mmoore@wellbridge.com",
      membershipType: "Basic Membership",
      club: "Wellbridge Test Club",
      address: "123 Test St",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      cellPhone: "555-123-4567",
      dateOfBirth: "1990-01-01",
      monthlyDues: 49.99,
      serviceAddons: [
        { name: "Personal Training", price: 25.0 },
        { name: "Group Classes", price: 15.0 },
      ],
      paymentInfo: {
        processorName: "FLUIDPAY",
      },
    };

    const testSignatureData = {
      signature: { text: "John Doe" },
      initials: { text: "JD" },
      selectedFont: { font: "'Great Vibes', cursive" },
    };

    const testSelectedClub = {
      name: "Wellbridge Test Club",
      state: "CO",
      city: "Denver",
    };

    // Create a simple mock PDF buffer for testing
    const mockPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF\n",
      "binary"
    );

    const emailSent = await emailService.sendWelcomeEmail(
      testData,
      testFormData,
      testSignatureData,
      mockPdfBuffer, // Include mock PDF for testing
      testSelectedClub
    );

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test email",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending test email",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/enrollment/test-error-notification
 * @desc Send a test error notification email
 * @access Public
 */
router.post("/test-error-notification", async (req, res) => {
  try {
    // Create a sample error
    const testError = new Error(
      "This is a test error notification from the Online Enrollment System"
    );
    testError.name = "TestError";
    testError.stack = `Error: This is a test error notification from the Online Enrollment System
    at testErrorNotification (enrollment.js:123:15)
    at processEnrollment (enrollment.js:456:20)
    at submitForm (form.js:789:10)`;

    // Create sample request context
    const sampleContext = {
      context: "Test Error Notification",
      userInfo: {
        email: "test.user@wellbridge.com",
        name: "Test User",
        membershipNumber: "TEST123456",
        sessionId: "SESSION-TEST-12345",
        ipAddress: req.ip || "192.168.1.100",
        userAgent: req.get("user-agent") || "Mozilla/5.0 (Test Browser)",
      },
    };

    // Create mock request object
    const mockReq = {
      method: "POST",
      originalUrl: "/api/enrollment/submit",
      url: "/api/enrollment/submit",
      route: { path: "/api/enrollment/submit" },
      params: {},
      query: { clubId: "254" },
      body: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        membershipType: "Individual",
        cardNumber: "***REDACTED***", // This would be automatically redacted
      },
      ip: req.ip || "192.168.1.100",
      get: (header) => {
        if (header === "user-agent") return "Mozilla/5.0 (Test Browser)";
        return null;
      },
      sessionId: "SESSION-TEST-12345",
      session: { id: "SESSION-TEST-12345" },
    };

    logger.info("Sending test error notification email");

    // Send the test error notification
    const sent = await errorNotificationService.notifyBackendError(
      testError,
      mockReq,
      sampleContext
    );

    if (sent) {
      return res.status(200).json({
        success: true,
        message:
          "Test error notification email sent successfully! Check your inbox.",
      });
    } else {
      return res.status(200).json({
        success: true,
        message:
          "Test notification was processed but not sent (likely in development mode). Set SEND_ERROR_EMAILS=true in .env to force sending in development.",
      });
    }
  } catch (error) {
    logger.error("Error sending test notification:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to send test error notification",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/enrollment/report-logs
 * @desc Receive and store frontend console logs
 * @access Public
 */
router.post("/report-logs", async (req, res) => {
  try {
    const { sessionId, logs, userAgent, url, timestamp } = req.body;

    logger.info("Frontend logs received", {
      sessionId,
      logCount: logs?.length || 0,
      url,
      userAgent,
    });

    // Log each entry to our backend logs
    if (logs && Array.isArray(logs)) {
      logs.forEach((log) => {
        const logLevel = log.level || "info";
        const message = `[Frontend ${sessionId}] ${log.message}`;

        switch (logLevel) {
          case "error":
            logger.error(message, { url: log.url, timestamp: log.timestamp });
            break;
          case "warn":
            logger.warn(message, { url: log.url, timestamp: log.timestamp });
            break;
          default:
            logger.info(message, { url: log.url, timestamp: log.timestamp });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logs received successfully",
    });
  } catch (error) {
    logger.error("Error processing frontend logs:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to process logs",
    });
  }
});

/**
 * @route POST /api/enrollment/report-error
 * @desc Report frontend errors for email notification
 * @access Public
 */
router.post("/report-error", async (req, res) => {
  try {
    const errorPayload = req.body;

    logger.error("Frontend error reported", {
      errorId: errorPayload.errorId,
      errorMessage: errorPayload.errorMessage,
      url: errorPayload.url,
      userAgent: errorPayload.userAgent,
    });

    // Send error notification email
    await errorNotificationService.notifyFrontendError(errorPayload);

    return res.status(200).json({
      success: true,
      message: "Error reported successfully",
    });
  } catch (error) {
    logger.error("Error reporting frontend error:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to report error",
    });
  }
});

/**
 * @route GET /api/enrollment/sales-reps
 * @desc Get sales reps for a specific club
 * @access Public
 */
router.get("/sales-reps", async (req, res) => {
  try {
    const { clubId } = req.query;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club ID is required",
      });
    }

    logger.info("Getting sales reps for club:", { clubId });

    // Execute the stored procedure to get sales reps
    const result = await pool.query(
      clubId,
      "EXECUTE PROCEDURE web_proc_GetSalesReps(?)",
      [clubId]
    );

    if (!result || result.length === 0) {
      return res.json({
        success: true,
        salesReps: [],
      });
    }

    // Transform the result to include both sales_rep and emp_code
    const salesReps = result.map((row) => ({
      salesRep: row.sales_reps,
      empCode: row.emp_code,
      email: row.email || row.sales_rep_email || row.emp_email || null,
    }));

    logger.info("Sales reps retrieved successfully:", {
      clubId,
      count: salesReps.length,
    });

    return res.json({
      success: true,
      salesReps,
    });
  } catch (error) {
    logger.error("Error getting sales reps:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sales reps",
      error: error.message,
    });
  }
});

export default router;
