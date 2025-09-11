import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import logger from "./utils/logger.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// Import routes
// import authRoutes from './routes/auth.js';
// import userRoutes from './routes/users.js';
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

// Configure dotenv
dotenv.config();

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 5001;

// Converge configuration
const CONVERGE_BASE = (
  process.env.CONVERGE_BASE || "https://api.convergepay.com"
).trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const uploadDir = path.join(__dirname, "contracts");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // For now, let's use a simple filename and handle the naming in the route
    const timestamp = Date.now();
    const fileName = `contract_${timestamp}.pdf`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  // Ensure form fields are parsed
  preserveExtension: true,
});

// Create a separate upload instance for the save-contract route
const uploadAny = multer({
  storage: storage,
  preserveExtension: true,
});

// Middleware
// Security and CORS middleware
app.use(helmet());

// CORS configuration with Cloudflare tunnel support
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedConvergeOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Combine all allowed origins
const allAllowedOrigins = [...allowedOrigins, ...allowedConvergeOrigins];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow all origins
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      // In production, check against allowed origins
      if (allAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        console.log(`Allowed origins: ${allAllowedOrigins.join(", ")}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Parse JSON bodies with increased limit for PDFs
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // Parse URL-encoded bodies with increased limit
app.use(morgan("dev")); // Logging

// Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running" });
});

// New optimized PDF save endpoint using raw binary
app.post(
  "/api/save-contract-pdf",
  express.raw({ type: "application/pdf", limit: "15mb" }),
  async (req, res) => {
    try {
      const membershipNumber = req.header("x-contract-id") || "unknown";
      const memberName = req.header("x-member-id") || "unknown";

      // Parse member name (format: "firstName_lastName")
      const nameParts = memberName.split("_");
      const firstName = nameParts[0] || "";
      const lastName = nameParts[1] || "";

      // Get current date in MM-DD-YYYY format
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}-${today.getFullYear()}`;

      // Generate proper filename: mm-dd-yyyy member# first name last name ONLINE.pdf
      const fileName = `${formattedDate} ${membershipNumber} ${firstName} ${lastName} ONLINE.pdf`;
      const savePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(savePath, req.body);
      logger.info(`PDF contract saved: ${fileName}`);
      res.json({
        ok: true,
        savedAs: fileName,
        message: "Contract saved successfully",
      });
    } catch (err) {
      logger.error("PDF save failed:", err);
      res.status(500).json({
        ok: false,
        error: err.message,
        message: "Failed to save contract",
      });
    }
  }
);

app.post("/api/save-contract", uploadAny.any(), (req, res) => {
  if (req.files && req.files.length > 0) {
    // Log all the form data received
    console.log("Received form data:", {
      memberId: req.body.memberId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      date: req.body.date,
      allBodyKeys: Object.keys(req.body || {}),
      filesCount: req.files.length,
    });

    // Generate proper filename: mm-dd-yyyy member# first name last name ONLINE.pdf
    const memberId = req.body.memberId || "unknown";
    const firstName = req.body.firstName || "";
    const lastName = req.body.lastName || "";
    const date = req.body.date || new Date().toISOString().split("T")[0];

    // Convert date from YYYY-MM-DD to MM-DD-YYYY format
    const dateParts = date.split("-");
    const formattedDate = `${dateParts[1]}-${dateParts[2]}-${dateParts[0]}`;

    const properFileName = `${formattedDate} ${memberId} ${firstName} ${lastName} ONLINE.pdf`;

    // Rename the uploaded file
    const uploadedFile = req.files[0];
    const oldPath = uploadedFile.path;
    const newPath = path.join(uploadDir, properFileName);

    try {
      fs.renameSync(oldPath, newPath);
      console.log(`File renamed from ${oldPath} to ${newPath}`);
      logger.info(
        `Contract saved for member: ${req.body.memberId} as ${properFileName}`
      );
      res.status(200).json({ message: "Contract saved successfully" });
    } catch (error) {
      console.error("Error renaming file:", error);
      logger.error("Error renaming contract file:", error);
      res.status(500).json({ message: "Error saving contract" });
    }
  } else {
    logger.error("No file uploaded in save-contract request");
    res.status(400).json({ message: "No file uploaded" });
  }
});

// Register route modules
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/payment", paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.message}`, { stack: err.stack });
  res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
