/**
 * Development Logger
 * Wrapper around console methods that only logs in development
 * Prevents sensitive information from being exposed in production console
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Development-only logger
 * All methods are no-ops in production
 */
const devLogger = {
  /**
   * Log general information (development only)
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log("[DEV]", ...args);
    }
  },

  /**
   * Log debug information (development only)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log("[DEBUG]", ...args);
    }
  },

  /**
   * Log warnings (development only)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn("[DEV WARNING]", ...args);
    }
  },

  /**
   * Log errors (always logged, but with less detail in production)
   */
  error: (...args) => {
    if (isDevelopment) {
      console.error("[DEV ERROR]", ...args);
    } else {
      // In production, log generic error without sensitive details
      console.error(
        "An error occurred. Please contact support if this persists."
      );
    }
  },

  /**
   * Log API requests/responses (development only)
   */
  api: (method, url, data = null) => {
    if (isDevelopment) {
      console.log(`[API ${method}]`, url, data || "");
    }
  },

  /**
   * Log form data (development only - often contains sensitive info)
   */
  form: (formName, data) => {
    if (isDevelopment) {
      console.log(`[FORM: ${formName}]`, data);
    }
  },

  /**
   * Log payment/sensitive data (development only)
   */
  payment: (message, data = null) => {
    if (isDevelopment) {
      console.log("[PAYMENT]", message, data || "");
    }
  },

  /**
   * Log state changes (development only)
   */
  state: (component, stateName, value) => {
    if (isDevelopment) {
      console.log(`[STATE: ${component}]`, stateName, "=", value);
    }
  },

  /**
   * Log database/backend data (development only)
   */
  data: (label, data) => {
    if (isDevelopment) {
      console.log(`[DATA: ${label}]`, data);
    }
  },

  /**
   * Performance timing (development only)
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(`[TIMER] ${label}`);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(`[TIMER] ${label}`);
    }
  },

  /**
   * Group logs (development only)
   */
  group: (label) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Table display (development only)
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Log with custom styling (development only)
   */
  styled: (message, styles = "color: blue; font-weight: bold;") => {
    if (isDevelopment) {
      console.log(`%c${message}`, styles);
    }
  },

  /**
   * Always log (production safe messages only)
   * Use this for messages that are safe to show users
   */
  info: (...args) => {
    console.info(...args);
  },

  /**
   * Check if in development mode
   */
  isDevelopment: () => isDevelopment,

  /**
   * Sanitize sensitive data for logging
   */
  sanitize: (data) => {
    if (!data) return data;

    const sanitized = { ...data };
    const sensitiveFields = [
      "password",
      "cardNumber",
      "cvv",
      "ssn",
      "socialSecurityNumber",
      "accountNumber",
      "routingNumber",
      "pin",
      "securityCode",
      "creditCard",
      "debitCard",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    });

    // Sanitize nested objects
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = devLogger.sanitize(sanitized[key]);
      }
    });

    return sanitized;
  },
};

// Export helper for conditional logging
export const logOnlyInDev = (callback) => {
  if (isDevelopment) {
    callback();
  }
};

export default devLogger;









