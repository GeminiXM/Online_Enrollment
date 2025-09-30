import api from "../services/api";

/**
 * Frontend Console Logger
 * Captures console logs in production and optionally sends them to backend
 */
class ConsoleLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 logs in memory
    this.sessionId = this.getSessionId();
    this.setupConsoleOverrides();
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    const existing = sessionStorage.getItem("sessionId");
    if (existing) return existing;

    const sessionId = `SESSION-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("sessionId", sessionId);
    return sessionId;
  }

  /**
   * Override console methods to capture logs
   */
  setupConsoleOverrides() {
    // Only capture in production
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "ConsoleLogger: Running in development mode, console capture disabled"
      );
      return;
    }

    // Store original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Override console.log
    console.log = (...args) => {
      this.captureLog("log", args);
      this.originalConsole.log.apply(console, args);
    };

    // Override console.error
    console.error = (...args) => {
      this.captureLog("error", args);
      this.originalConsole.error.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args) => {
      this.captureLog("warn", args);
      this.originalConsole.warn.apply(console, args);
    };

    // Override console.info
    console.info = (...args) => {
      this.captureLog("info", args);
      this.originalConsole.info.apply(console, args);
    };

    console.log("ConsoleLogger: Console capture initialized for production");
  }

  /**
   * Capture a console log
   */
  captureLog(level, args) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.formatArgs(args),
      url: window.location.href,
      sessionId: this.sessionId,
    };

    // Add to memory buffer
    this.logs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Store critical errors immediately
    if (level === "error") {
      this.storeLogsLocally();
    }
  }

  /**
   * Format console arguments into a string
   */
  formatArgs(args) {
    return args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");
  }

  /**
   * Store logs in localStorage for persistence
   */
  storeLogsLocally() {
    try {
      const existingLogs = JSON.parse(
        localStorage.getItem("consoleLogs") || "[]"
      );
      const allLogs = [...existingLogs, ...this.logs].slice(-200); // Keep last 200 logs
      localStorage.setItem("consoleLogs", JSON.stringify(allLogs));
    } catch (e) {
      // localStorage might be full or disabled
      console.error("Failed to store logs locally:", e);
    }
  }

  /**
   * Get all captured logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Get logs from localStorage
   */
  getStoredLogs() {
    try {
      return JSON.parse(localStorage.getItem("consoleLogs") || "[]");
    } catch (e) {
      return [];
    }
  }

  /**
   * Send logs to backend (useful for debugging issues)
   */
  async sendLogsToBackend() {
    if (process.env.NODE_ENV !== "production") {
      console.log("ConsoleLogger: Not sending logs (development mode)");
      return false;
    }

    try {
      const allLogs = [...this.getStoredLogs(), ...this.logs];

      if (allLogs.length === 0) {
        console.log("ConsoleLogger: No logs to send");
        return false;
      }

      await api.post("/api/enrollment/report-logs", {
        sessionId: this.sessionId,
        logs: allLogs,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });

      console.log("ConsoleLogger: Logs sent to backend successfully");

      // Clear logs after sending
      this.logs = [];
      localStorage.removeItem("consoleLogs");

      return true;
    } catch (error) {
      console.error("ConsoleLogger: Failed to send logs to backend:", error);
      return false;
    }
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    localStorage.removeItem("consoleLogs");
  }

  /**
   * Export logs as downloadable file
   */
  downloadLogs() {
    const allLogs = [...this.getStoredLogs(), ...this.logs];
    const logsText = allLogs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join("\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Static method to manually send logs
   */
  static async sendLogs() {
    const logger = new ConsoleLogger();
    return await logger.sendLogsToBackend();
  }

  /**
   * Static method to download logs
   */
  static downloadLogs() {
    const logger = new ConsoleLogger();
    logger.downloadLogs();
  }
}

// Initialize the console logger
const consoleLogger = new ConsoleLogger();

// Add global helper function for debugging
if (typeof window !== "undefined") {
  window.sendConsoleLogs = () => ConsoleLogger.sendLogs();
  window.downloadConsoleLogs = () => ConsoleLogger.downloadLogs();
}

export default consoleLogger;
