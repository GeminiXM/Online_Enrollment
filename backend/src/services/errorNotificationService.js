import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

/**
 * Error Notification Service - Sends detailed error reports via email
 */
class ErrorNotificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
    this.errorRecipients = process.env.ERROR_NOTIFICATION_EMAILS
      ? process.env.ERROR_NOTIFICATION_EMAILS.split(",").map((email) =>
          email.trim()
        )
      : ["mmoore@wellbridge.com"]; // Default recipient
  }

  /**
   * Initialize the email transporter
   */
  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "wellbridge.prxy.com",
      port: parseInt(process.env.SMTP_PORT) || 25,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "onlineenrollment@wellbridge.com",
        pass: process.env.SMTP_PASS || "W3llbridge&0nl1n3",
      },
    });
  }

  /**
   * Format error details for email
   */
  formatErrorEmail(errorData) {
    const {
      error,
      context,
      userInfo,
      requestInfo,
      timestamp,
      environment,
      stackTrace,
    } = errorData;

    const errorMessage = error?.message || "Unknown error";
    const errorName = error?.name || "Error";
    const stack = stackTrace || error?.stack || "No stack trace available";

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #d32f2f; color: white; padding: 20px; border-radius: 5px; }
    .section { background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .section-title { font-weight: bold; color: #d32f2f; margin-bottom: 10px; font-size: 18px; }
    .code { background-color: #272822; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 12px; }
    .label { font-weight: bold; color: #555; }
    .value { margin-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    td:first-child { font-weight: bold; width: 200px; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Production Error Alert</h1>
      <p>An error occurred in the Online Enrollment System</p>
    </div>

    <div class="section">
      <div class="section-title">Error Details</div>
      <table>
        <tr><td>Error Type:</td><td>${errorName}</td></tr>
        <tr><td>Error Message:</td><td>${errorMessage}</td></tr>
        <tr><td>Timestamp:</td><td>${
          timestamp || new Date().toISOString()
        }</td></tr>
        <tr><td>Environment:</td><td>${environment || "production"}</td></tr>
        ${context ? `<tr><td>Context:</td><td>${context}</td></tr>` : ""}
      </table>
    </div>

    ${
      userInfo
        ? `
    <div class="section">
      <div class="section-title">User Information</div>
      <table>
        ${
          userInfo.email
            ? `<tr><td>Email:</td><td>${userInfo.email}</td></tr>`
            : ""
        }
        ${
          userInfo.name
            ? `<tr><td>Name:</td><td>${userInfo.name}</td></tr>`
            : ""
        }
        ${
          userInfo.membershipNumber
            ? `<tr><td>Membership #:</td><td>${userInfo.membershipNumber}</td></tr>`
            : ""
        }
        ${
          userInfo.sessionId
            ? `<tr><td>Session ID:</td><td>${userInfo.sessionId}</td></tr>`
            : ""
        }
        ${
          userInfo.ipAddress
            ? `<tr><td>IP Address:</td><td>${userInfo.ipAddress}</td></tr>`
            : ""
        }
        ${
          userInfo.userAgent
            ? `<tr><td>User Agent:</td><td>${userInfo.userAgent}</td></tr>`
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    ${
      requestInfo
        ? `
    <div class="section">
      <div class="section-title">Request Information</div>
      <table>
        ${
          requestInfo.method
            ? `<tr><td>HTTP Method:</td><td>${requestInfo.method}</td></tr>`
            : ""
        }
        ${
          requestInfo.url
            ? `<tr><td>URL:</td><td>${requestInfo.url}</td></tr>`
            : ""
        }
        ${
          requestInfo.route
            ? `<tr><td>Route:</td><td>${requestInfo.route}</td></tr>`
            : ""
        }
        ${
          requestInfo.params
            ? `<tr><td>Params:</td><td>${JSON.stringify(
                requestInfo.params
              )}</td></tr>`
            : ""
        }
        ${
          requestInfo.body
            ? `<tr><td>Request Body:</td><td><pre>${JSON.stringify(
                requestInfo.body,
                null,
                2
              )}</pre></td></tr>`
            : ""
        }
        ${
          requestInfo.query
            ? `<tr><td>Query String:</td><td>${JSON.stringify(
                requestInfo.query
              )}</td></tr>`
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    <div class="section">
      <div class="section-title">Stack Trace</div>
      <div class="code">${this.escapeHtml(stack)}</div>
    </div>

    <div class="section">
      <div class="section-title">Action Required</div>
      <p>Please investigate this error and take appropriate action. Check the application logs for more details.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML to prevent injection
   */
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Send error notification email
   */
  async sendErrorNotification(errorData) {
    // Only send error emails in production or if explicitly enabled
    const isProduction = process.env.NODE_ENV === "production";
    const forceErrorEmails = process.env.SEND_ERROR_EMAILS === "true";

    if (!isProduction && !forceErrorEmails) {
      logger.info("Error notification skipped (not in production)", {
        errorMessage: errorData.error?.message,
        environment: process.env.NODE_ENV,
      });
      return false;
    }

    try {
      const htmlContent = this.formatErrorEmail(errorData);
      const errorMessage = errorData.error?.message || "Unknown error";
      const context = errorData.context ? ` - ${errorData.context}` : "";

      const mailOptions = {
        from: process.env.SMTP_USER || "onlineenrollment@wellbridge.com",
        to: this.errorRecipients.join(", "),
        subject: `🚨 Production Error Alert: ${errorMessage}${context}`,
        html: htmlContent,
        priority: "high",
      };

      logger.info("Sending error notification email", {
        recipients: this.errorRecipients,
        error: errorMessage,
        context: errorData.context,
      });

      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Error notification email sent successfully", {
        messageId: info.messageId,
        recipients: this.errorRecipients,
      });

      return true;
    } catch (emailError) {
      logger.error("Failed to send error notification email", {
        error: emailError.message,
        stack: emailError.stack,
      });
      return false;
    }
  }

  /**
   * Send error notification for backend errors
   */
  async notifyBackendError(error, req = null, additionalContext = {}) {
    const errorData = {
      error,
      context: additionalContext.context || "Backend Error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      stackTrace: error.stack,
      userInfo: {
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get("user-agent"),
        sessionId: req?.sessionId || req?.session?.id,
        ...additionalContext.userInfo,
      },
      requestInfo: req
        ? {
            method: req.method,
            url: req.originalUrl || req.url,
            route: req.route?.path,
            params: req.params,
            query: req.query,
            body: this.sanitizeRequestBody(req.body),
          }
        : null,
    };

    return await this.sendErrorNotification(errorData);
  }

  /**
   * Send error notification for frontend errors
   */
  async notifyFrontendError(errorPayload) {
    const errorData = {
      error: {
        name: errorPayload.errorName || "Frontend Error",
        message: errorPayload.errorMessage || "Unknown frontend error",
        stack: errorPayload.stackTrace,
      },
      context: errorPayload.context || "Frontend Error",
      timestamp: errorPayload.timestamp || new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      stackTrace: errorPayload.stackTrace,
      userInfo: {
        ipAddress: errorPayload.ipAddress,
        userAgent: errorPayload.userAgent,
        sessionId: errorPayload.sessionId,
        email: errorPayload.userEmail,
        name: errorPayload.userName,
        membershipNumber: errorPayload.membershipNumber,
      },
      requestInfo: {
        url: errorPayload.url,
        route: errorPayload.route,
        componentStack: errorPayload.componentStack,
        previousRoute: errorPayload.previousRoute,
        formData: this.sanitizeRequestBody(errorPayload.formData),
      },
    };

    return await this.sendErrorNotification(errorData);
  }

  /**
   * Sanitize sensitive data from request body
   */
  sanitizeRequestBody(body) {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = [
      "password",
      "cardNumber",
      "cvv",
      "ssn",
      "accountNumber",
      "cardVerificationValue",
      "creditCard",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    });

    return sanitized;
  }
}

export default new ErrorNotificationService();
