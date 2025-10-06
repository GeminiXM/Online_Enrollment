import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

/**
 * Critical Alert Service
 * Sends immediate email notifications for critical events
 * (separate from error notifications for high-priority business events)
 */
class CriticalAlertService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
    this.alertRecipients =
      process.env.CRITICAL_ALERT_EMAILS ||
      process.env.ERROR_NOTIFICATION_EMAILS ||
      "mmoore@wellbridge.com";
  }

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
   * Send alert for database connection failures
   */
  async alertDatabaseFailure(clubId, error, consecutiveFailures = 1) {
    const subject = `🔴 CRITICAL: Database Connection Failed - Club ${clubId}`;
    const html = `
      <h2 style="color: #d32f2f;">Database Connection Failure</h2>
      <p><strong>Club ID:</strong> ${clubId}</p>
      <p><strong>Consecutive Failures:</strong> ${consecutiveFailures}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><strong>Impact:</strong> Users cannot enroll for this club</p>
      <p><strong>Action Required:</strong> Check database connectivity immediately</p>
    `;

    return await this.sendAlert(subject, html, "database_failure");
  }

  /**
   * Send alert for payment processor failures
   */
  async alertPaymentProcessorFailure(processor, clubId, error) {
    const subject = `🔴 CRITICAL: Payment Processor Down - ${processor}`;
    const html = `
      <h2 style="color: #d32f2f;">Payment Processor Failure</h2>
      <p><strong>Processor:</strong> ${processor}</p>
      <p><strong>Club ID:</strong> ${clubId}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><strong>Impact:</strong> Users cannot complete enrollments (payment step will fail)</p>
      <p><strong>Action Required:</strong> Check ${processor} service status and credentials</p>
    `;

    return await this.sendAlert(subject, html, "payment_failure");
  }

  /**
   * Send alert when enrollment submission fails
   */
  async alertEnrollmentFailure(enrollmentData, error) {
    const subject = `⚠️ Enrollment Submission Failed - ${
      enrollmentData.email || "Unknown User"
    }`;
    const html = `
      <h2 style="color: #f57c00;">Enrollment Submission Failed</h2>
      <p><strong>User:</strong> ${enrollmentData.firstName} ${
      enrollmentData.lastName
    }</p>
      <p><strong>Email:</strong> ${enrollmentData.email}</p>
      <p><strong>Club:</strong> ${enrollmentData.club}</p>
      <p><strong>Membership Type:</strong> ${enrollmentData.membershipType}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><strong>Impact:</strong> User may have paid but enrollment not recorded</p>
      <p><strong>Action Required:</strong> Manually verify and complete enrollment if payment was processed</p>
    `;

    return await this.sendAlert(subject, html, "enrollment_failure");
  }

  /**
   * Send alert when email service fails
   */
  async alertEmailServiceFailure(recipientEmail, error) {
    const subject = `⚠️ Email Service Failure - Welcome Email Not Sent`;
    const html = `
      <h2 style="color: #f57c00;">Email Service Failure</h2>
      <p><strong>Recipient:</strong> ${recipientEmail}</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><strong>Impact:</strong> User did not receive welcome email with contract</p>
      <p><strong>Action Required:</strong> Manually send welcome email to user</p>
    `;

    return await this.sendAlert(subject, html, "email_failure");
  }

  /**
   * Send alert when service is back online
   */
  async alertServiceRestored(serviceName, downtime) {
    const subject = `✅ Service Restored: ${serviceName}`;
    const html = `
      <h2 style="color: #388e3c;">Service Restored</h2>
      <p><strong>Service:</strong> ${serviceName}</p>
      <p><strong>Downtime:</strong> ${downtime}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p>The service is now operating normally.</p>
    `;

    return await this.sendAlert(subject, html, "service_restored");
  }

  /**
   * Send alert for high error rate
   */
  async alertHighErrorRate(errorCount, timeWindow) {
    const subject = `⚠️ HIGH ERROR RATE DETECTED`;
    const html = `
      <h2 style="color: #d32f2f;">High Error Rate Alert</h2>
      <p><strong>Error Count:</strong> ${errorCount}</p>
      <p><strong>Time Window:</strong> ${timeWindow}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><strong>Impact:</strong> System may be experiencing widespread issues</p>
      <p><strong>Action Required:</strong> Check logs and investigate immediately</p>
    `;

    return await this.sendAlert(subject, html, "high_error_rate");
  }

  /**
   * Send generic critical alert
   */
  async sendAlert(subject, html, alertType) {
    // Only send in production or if explicitly enabled
    const isProduction = process.env.NODE_ENV === "production";
    const forceAlerts = process.env.SEND_CRITICAL_ALERTS === "true";

    if (!isProduction && !forceAlerts) {
      logger.info("Critical alert skipped (not in production)", {
        subject,
        alertType,
      });
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_USER || "onlineenrollment@wellbridge.com",
        to: this.alertRecipients,
        subject,
        html,
        priority: "high",
      };

      logger.info("Sending critical alert", {
        subject,
        alertType,
        recipients: this.alertRecipients,
      });

      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Critical alert sent successfully", {
        messageId: info.messageId,
        alertType,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send critical alert", {
        error: error.message,
        stack: error.stack,
        alertType,
      });
      return false;
    }
  }
}

export default new CriticalAlertService();





