// backend/src/utils/logger.js
// This file contains a logging utility for the backend application.
// It provides consistent logging with appropriate formatting and levels.
// Includes log rotation and production-ready configurations.

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import DailyRotateFile from "winston-daily-rotate-file";

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Determine the log level based on environment
const level = process.env.NODE_ENV === "production" ? "info" : "debug";

// Define the format for logs
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  // Add colors
  winston.format.colorize({ all: true }),
  // Define the format of the message showing the timestamp, the level and the message
  winston.format.printf((info) => {
    if (typeof info.message === "object") {
      return `${info.timestamp} ${info.level}: ${JSON.stringify(
        info.message,
        null,
        2
      )}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Production log format without colors (for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    if (typeof message === "object") {
      return `${timestamp} ${level}: ${JSON.stringify(
        message,
        null,
        2
      )} ${metaString}`;
    }
    return `${timestamp} ${level}: ${message} ${metaString}`;
  })
);

// Define which transports the logger must use
const transports = [
  // Console transport with more detailed output
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // Daily rotating file for all logs with automatic cleanup
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/application-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m", // Rotate when file reaches 20MB
    maxFiles: "14d", // Keep logs for 14 days
    format: fileFormat,
    level: "info", // Log info and above to files
  }),

  // Daily rotating file for error logs only
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "30d", // Keep error logs longer (30 days)
    level: "error",
    format: fileFormat,
  }),

  // Daily rotating file for HTTP requests
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "7d", // Keep HTTP logs for 7 days
    level: "http",
    format: fileFormat,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level,
  levels,
  format,
  transports,
});

// Export the logger
export default logger;
