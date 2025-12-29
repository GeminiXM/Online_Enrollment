import logger from "../utils/logger.js";
import errorNotificationService from "../services/errorNotificationService.js";

/**
 * Global error handler middleware
 * Catches all errors and sends notifications in production
 */
export const errorHandler = async (err, req, res, next) => {
  // Determine status code early (used for logging + alerting decisions)
  const statusCode = err.statusCode || err.status || 500;

  // Log the error
  const logMeta = {
    statusCode,
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };

  if (statusCode >= 500) {
    logger.error("Application error occurred", logMeta);
  } else {
    // 4xx errors are expected sometimes (bots probing, bad routes, etc.) — keep visibility without paging via email
    logger.warn("Request error occurred", logMeta);
  }

  // Send error notification email ONLY for server errors (5xx), and skip HEAD probes
  const shouldNotify =
    statusCode >= 500 && req.method !== "HEAD" && err?.shouldNotify !== false;

  if (shouldNotify) {
    try {
      await errorNotificationService.notifyBackendError(err, req, {
        context: `${req.method} ${req.originalUrl}`,
      });
    } catch (notificationError) {
      logger.error("Failed to send error notification", {
        error: notificationError.message,
      });
    }
  }

  const message = err.message || "Internal Server Error";

  // Send response to client
  res.status(statusCode).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred. Our team has been notified."
          : message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  // Ignore common probe paths to reduce noise (bots scanning for env files, etc.)
  const reqPath = req.path || req.originalUrl?.split("?")?.[0] || "";
  const ignored404s = [
    "/.env",
    "/.env.example",
    "/api/.env",
    "/api/.env.example",
    // Common API probe endpoints
    "/api/actions",
    "/api/v1/pods",
    "/api/sonicos/auth",
    "/api/sonicos/tfa",
    "/api/v1/version",
    "/api/v1/system/platform",
    "/api/server/version",
    "/api/v2/cmdb/system/admin",
  ];

  if (ignored404s.includes(reqPath)) {
    return res.status(404).end();
  }

  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  // Never notify (email) for 404s — these are almost always scans/mistyped URLs
  error.shouldNotify = false;
  next(error);
};
