import logger from "../utils/logger.js";
import errorNotificationService from "../services/errorNotificationService.js";

/**
 * Global error handler middleware
 * Catches all errors and sends notifications in production
 */
export const errorHandler = async (err, req, res, next) => {
  // Log the error
  logger.error("Application error occurred", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Send error notification email in production
  try {
    await errorNotificationService.notifyBackendError(err, req, {
      context: `${req.method} ${req.originalUrl}`,
    });
  } catch (notificationError) {
    logger.error("Failed to send error notification", {
      error: notificationError.message,
    });
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
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
  const ignored404s = [
    "/.env",
    "/.env.example",
    "/api/.env",
    "/api/.env.example",
  ];

  if (ignored404s.includes(req.originalUrl)) {
    return res.status(404).end();
  }

  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
