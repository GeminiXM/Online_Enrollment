// backend/src/routes/enrollmentRoutes.js
// This file contains API routes for handling gym membership enrollment.
// It includes endpoints for submitting enrollment forms and retrieving enrollment data.

import express from "express";
import { body, validationResult } from "express-validator";
import logger from "../utils/logger.js";

const router = express.Router();

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
  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .isDate()
    .withMessage("Invalid date format"),

  // Emergency contact validation - if one is provided, both are required
  body("emergencyContactPhone")
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (value && !req.body.emergencyContactName) {
        throw new Error(
          "Emergency contact name is required if phone is provided"
        );
      }
      if (value) {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(value)) {
          throw new Error("Invalid emergency contact phone format");
        }
      }
      return true;
    }),
  body("emergencyContactName")
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (value && !req.body.emergencyContactPhone) {
        throw new Error(
          "Emergency contact phone is required if name is provided"
        );
      }
      return true;
    }),
];

/**
 * @route POST /api/enrollment
 * @desc Submit a new enrollment form
 * @access Public
 */
router.post("/", validateEnrollmentData, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Extract enrollment data from request body
    const enrollmentData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      email: req.body.email,
      cellPhone: req.body.cellPhone,
      homePhone: req.body.homePhone,
      workPhone: req.body.workPhone,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactPhone: req.body.emergencyContactPhone,
      // Add timestamp for when the enrollment was submitted
      submittedAt: new Date(),
    };

    // TODO: In a real application, you would:
    // 1. Connect to your Informix database
    // 2. Call the appropriate stored procedure to insert the enrollment data
    // 3. Handle any database errors

    // For now, we'll just log the data and return a success response
    logger.info("New enrollment submission", {
      email: enrollmentData.email,
      name: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
    });

    // Simulate database processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return success response with enrollment ID (simulated)
    return res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully",
      data: {
        enrollmentId: `ENR-${Date.now()}`, // Generate a unique ID
        submittedAt: enrollmentData.submittedAt,
      },
    });
  } catch (error) {
    logger.error("Error processing enrollment submission", {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while processing your enrollment. Please try again later.",
    });
  }
});

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

export default router;
