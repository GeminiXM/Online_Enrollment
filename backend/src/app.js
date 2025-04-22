import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import logger from "./utils/logger.js";

// Import routes
// import authRoutes from './routes/auth.js';
// import userRoutes from './routes/users.js';
import enrollmentRoutes from "./routes/enrollmentRoutes.js";

// Configure dotenv
dotenv.config();

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    // Allow specific origins in production, or all origins in development
    origin: process.env.NODE_ENV === 'production' 
      ? function(origin, callback) {
          const allowedOrigins = process.env.CORS_ORIGIN.split(',');
          // Allow requests with no origin (like mobile apps or curl requests)
          if(!origin) return callback(null, true);
          if(allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      : true,
    credentials: true
  })
);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("dev")); // Logging

// Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running" });
});

// Register route modules
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use("/api/enrollment", enrollmentRoutes);

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
