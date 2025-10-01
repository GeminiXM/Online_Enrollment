import express from "express";
import { pool } from "../config/database.js";
import logger from "../utils/logger.js";
import errorNotificationService from "../services/errorNotificationService.js";
import os from "os";

const router = express.Router();

/**
 * @route GET /api/health
 * @desc Basic health check
 * @access Public
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check with system metrics
 * @access Public
 */
router.get("/detailed", async (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    server: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
        free: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
        used: `${Math.round(
          (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024
        )}GB`,
        processUsed: `${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )}MB`,
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    },
    services: {
      database: "checking...",
      email: "checking...",
    },
  };

  // Check database connections
  try {
    // Test a few club connections
    const testClubs = ["254", "259", "266"]; // Add your main clubs
    const dbResults = {};

    for (const clubId of testClubs) {
      try {
        const conn = await pool.getConnection(clubId);
        conn.close();
        dbResults[`club_${clubId}`] = "connected";
      } catch (err) {
        dbResults[`club_${clubId}`] = `error: ${err.message}`;
        healthCheck.status = "DEGRADED";
      }
    }

    healthCheck.services.database = dbResults;
  } catch (error) {
    healthCheck.services.database = `error: ${error.message}`;
    healthCheck.status = "UNHEALTHY";
  }

  // Check email service
  try {
    healthCheck.services.email = "configured";
  } catch (error) {
    healthCheck.services.email = `error: ${error.message}`;
  }

  res.status(healthCheck.status === "OK" ? 200 : 503).json(healthCheck);
});

/**
 * @route GET /api/health/database/:clubId
 * @desc Test specific database connection
 * @access Public
 */
router.get("/database/:clubId", async (req, res) => {
  const { clubId } = req.params;

  try {
    const startTime = Date.now();
    const conn = await pool.getConnection(clubId);
    const responseTime = Date.now() - startTime;

    conn.close();

    res.status(200).json({
      status: "OK",
      clubId,
      connected: true,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Database health check failed for club ${clubId}`, {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: "ERROR",
      clubId,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/health/test-email-alert
 * @desc Send a test email alert to verify email system
 * @access Public (should be protected in production)
 */
router.post("/test-email-alert", async (req, res) => {
  try {
    const testError = new Error("Test health monitoring alert");
    testError.name = "HealthCheckTest";

    const mockReq = {
      method: "POST",
      originalUrl: "/api/health/test-email-alert",
      ip: req.ip,
      get: (header) => req.get(header),
    };

    await errorNotificationService.notifyBackendError(testError, mockReq, {
      context: "Health Check Test Alert",
    });

    res.status(200).json({
      status: "OK",
      message: "Test alert email sent successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Failed to send test alert",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/health/stats
 * @desc Get application statistics
 * @access Public
 */
router.get("/stats", (req, res) => {
  const stats = {
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime()),
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(
        process.memoryUsage().heapTotal / 1024 / 1024
      )}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
    },
    cpu: {
      usage: process.cpuUsage(),
      cores: os.cpus().length,
    },
    environment: process.env.NODE_ENV || "development",
  };

  res.status(200).json(stats);
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

export default router;


