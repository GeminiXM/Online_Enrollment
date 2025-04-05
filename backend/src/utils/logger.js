// backend/src/utils/logger.js
// This file contains a logging utility for the backend application.
// It provides consistent logging with appropriate formatting and levels.

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

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

// Define which transports the logger must use
const transports = [
  // Console transport with more detailed output
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/all.log"),
  }),

  // File transport for error logs
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/error.log"),
    level: "error",
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
