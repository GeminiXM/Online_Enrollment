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
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? function (origin, callback) {
            const allowedOrigins = process.env.CORS_ORIGIN.split(",");
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          }
        : true,
    credentials: true,
  })
);

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    // Allow specific origins in production, or all origins in development
    origin:
      process.env.NODE_ENV === "production"
        ? function (origin, callback) {
            const allowedOrigins = process.env.CORS_ORIGIN.split(",");
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          }
        : true,
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
      const contractId = req.header("x-contract-id") || Date.now();
      const memberId = req.header("x-member-id") || "unknown";
      const fileName = `contract_${memberId}_${contractId}.pdf`;
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
