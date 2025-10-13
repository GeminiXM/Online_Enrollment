import api from "../services/api";

/**
 * Global Error Logger for Frontend
 * Captures unhandled errors and sends them to backend for email notification
 */
class ErrorLogger {
  constructor() {
    this.setupGlobalHandlers();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a unique session ID for this user session
   */
  generateSessionId() {
    const existing = sessionStorage.getItem("sessionId");
    if (existing) return existing;

    const sessionId = `SESSION-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("sessionId", sessionId);
    return sessionId;
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Only setup in production
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "ErrorLogger: Running in development mode, error emails disabled"
      );
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      this.logError(event.reason, {
        context: "Unhandled Promise Rejection",
        type: "promise",
      });
      // Prevent the default browser behavior
      event.preventDefault();
    });

    // Handle global JavaScript errors
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      this.logError(event.error, {
        context: "Global JavaScript Error",
        type: "error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    console.log(
      "ErrorLogger: Global error handlers initialized for production"
    );
  }

  /**
   * Log an error and send to backend
   */
  async logError(error, additionalInfo = {}) {
    try {
      const errorPayload = {
        errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        errorName: error?.name || "Unknown Error",
        errorMessage: error?.message || String(error),
        stackTrace: error?.stack || "No stack trace available",
        timestamp: new Date().toISOString(),
        url: window.location.href,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        context: additionalInfo.context || "Frontend Error",
        ...additionalInfo,
      };

      // Log to console for debugging
      console.error("Error logged:", errorPayload);

      // Only send to backend in production
      if (process.env.NODE_ENV === "production") {
        await api.post("/enrollment/report-error", errorPayload);
        console.log("Error reported to backend");
      } else {
        console.log("Dev mode - error not sent to backend");
      }
    } catch (reportError) {
      console.error("Failed to report error:", reportError);
    }
  }

  /**
   * Manually log an error (for try-catch blocks)
   */
  static logError(error, context = "") {
    const logger = new ErrorLogger();
    logger.logError(error, { context });
  }
}

// Initialize the error logger
const errorLogger = new ErrorLogger();

export default errorLogger;
