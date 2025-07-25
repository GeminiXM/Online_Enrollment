// backend/src/routes/enrollmentRoutes.js
// This file contains API routes for handling gym membership enrollment.
// It includes endpoints for submitting enrollment forms and retrieving enrollment data.

import express from "express";
import { body, validationResult } from "express-validator";
import logger from "../utils/logger.js";
import {
  submitEnrollment,
  getAddons,
  getSpecialtyMembershipBridgeCode,
  getMembershipPrice,
  getTaxRate,
} from "../controllers/enrollmentController.js";
import { pool } from "../config/database.js";

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
    .withMessage("Invalid date format"),
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

export default router;
