import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email service for sending welcoming emails with contract PDFs
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   */
  initializeTransporter() {
    // Configure for Wellbridge SMTP server
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "wellbridge.prxy.com",
      port: parseInt(process.env.SMTP_PORT) || 25,
      secure: false, // false for port 25
      auth: {
        user: process.env.SMTP_USER || "onlineenrollment@wellbridge.com",
        pass: process.env.SMTP_PASS || "W3llbridge&0nl1n3",
      },
    });
  }

  /**
   * Calculate monthly amount including dues, addons, and taxes
   */
  calculateMonthlyAmount(formData, selectedClub) {
    if (!formData) return 0;

    const monthlyDues = parseFloat(formData.monthlyDues || 0);
    const serviceAddons = formData.serviceAddons || [];
    const addonsTotal = serviceAddons.reduce(
      (sum, addon) => sum + parseFloat(addon.price || 0),
      0
    );

    // Calculate tax if applicable (New Mexico clubs)
    const isNewMexicoClub = selectedClub?.state === "NM";
    const taxRate = isNewMexicoClub ? formData.taxRate || 0.07625 : 0;
    const duesTax = isNewMexicoClub
      ? Number((monthlyDues * taxRate).toFixed(2))
      : 0;
    const addonsTax = isNewMexicoClub
      ? Number((addonsTotal * taxRate).toFixed(2))
      : 0;

    // Gross monthly total includes dues + addons + taxes
    const grossMonthlyTotal = monthlyDues + addonsTotal + duesTax + addonsTax;

    return grossMonthlyTotal.toFixed(2);
  }

  /**
   * Send welcoming email with contract PDF attachment
   * @param {Object} enrollmentData - The enrollment data
   * @param {Object} formData - The form data
   * @param {Object} signatureData - The signature data
   * @param {Buffer} contractPDFBuffer - The contract PDF buffer from frontend
   * @param {Object} selectedClub - The selected club information
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(
    enrollmentData,
    formData,
    signatureData,
    contractPDFBuffer,
    selectedClub
  ) {
    try {
      // Use the contract PDF buffer from frontend
      let pdfBuffer = null;
      if (contractPDFBuffer) {
        logger.info("Contract PDF buffer received", {
          type: typeof contractPDFBuffer,
          isArrayBuffer: contractPDFBuffer instanceof ArrayBuffer,
          isBuffer: Buffer.isBuffer(contractPDFBuffer),
          length: contractPDFBuffer.byteLength || contractPDFBuffer.length,
        });

        // Convert ArrayBuffer to Buffer if needed
        if (contractPDFBuffer instanceof ArrayBuffer) {
          pdfBuffer = Buffer.from(contractPDFBuffer);
        } else {
          pdfBuffer = contractPDFBuffer;
        }

        logger.info("PDF buffer processed", {
          isBuffer: Buffer.isBuffer(pdfBuffer),
          length: pdfBuffer.length,
        });
      } else {
        logger.warn("No contract PDF buffer provided, skipping PDF attachment");
      }

      // Email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">Welcome to ${
              formData.club || selectedClub?.name || "Wellbridge"
            }!</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #2c3e50;">Dear ${formData.firstName} ${
        formData.lastName
      },</h2>
            
            <p>Thank you for choosing to join our fitness community! We're excited to have you as a member.</p>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">Your Membership Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Membership Number:</strong> ${
                  enrollmentData.custCode
                }</li>
                <li><strong>Membership Type:</strong> ${
                  formData.membershipType
                }</li>
                <li><strong>Transaction ID:</strong> ${
                  enrollmentData.transactionId
                }</li>
                <li><strong>Start Date:</strong> ${
                  formData.requestedStartDate || new Date().toLocaleDateString()
                }</li>
                <li><strong>Home Club:</strong> ${
                  formData.club || selectedClub?.name || "Wellbridge"
                }</li>
                <li><strong>Payment Processor:</strong> ${
                  formData.paymentInfo?.processorName || "N/A"
                }</li>
                <li><strong>Amount Paid:</strong> $${
                  enrollmentData.amountBilled || 0
                }</li>
              </ul>
            </div>
            
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #1e90ff; margin-top: 0;">Monthly Fee Going Forward</h3>
              <p style="font-size: 18px; font-weight: bold; color: #2c3e50;">
                $${this.calculateMonthlyAmount(formData, selectedClub)}
              </p>
              <p style="font-size: 12px; color: #666;">
                Includes monthly dues, add-ons, and applicable taxes
              </p>
            </div>
            
            <h3>What's Next?</h3>
            <ol>
              <li><strong>Visit the Club:</strong> Bring a photo ID and your membership number to complete your registration.</li>
              <li><strong>Orientation:</strong> Schedule a free orientation session to learn about our facilities and programs.</li>
              <li><strong>Download Our App:</strong> Access your membership details, book classes, and track your progress.</li>
            </ol>
            
            <h3>Important Information</h3>
            <ul>
              <li>Your membership agreement is attached to this email for your records.</li>
              <li>Monthly dues will be automatically charged to your payment method.</li>
              <li>Please review our club rules and policies available on our website.</li>
              <li>For any questions, contact us at support@wellbridge.com or call (555) 123-4567.</li>
            </ul>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">Club Hours</h4>
              <p>Monday - Friday: 5:00 AM - 11:00 PM<br>
              Saturday - Sunday: 6:00 AM - 10:00 PM</p>
            </div>
            
            <p>We look forward to helping you achieve your fitness goals!</p>
            
            <p>Best regards,<br>
            The ${formData.club || selectedClub?.name || "Wellbridge"} Team</p>
          </div>
          
          <div style="background-color: #2c3e50; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This email was sent to ${
              formData.email
            }. If you have any questions, please contact us.</p>
          </div>
        </div>
      `;

      // Email options
      const mailOptions = {
        from: process.env.SMTP_FROM || "noreply@yourclub.com",
        to: formData.email,
        subject: `Welcome to ${formData.club || "Our Club"} - Membership #${
          enrollmentData.custCode
        }`,
        html: emailContent,
        attachments: pdfBuffer
          ? [
              {
                filename: `Membership_Agreement_${enrollmentData.custCode}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ]
          : [],
      };

      // Send email
      logger.info("Sending email with attachments", {
        hasAttachments:
          mailOptions.attachments && mailOptions.attachments.length > 0,
        attachmentCount: mailOptions.attachments
          ? mailOptions.attachments.length
          : 0,
        to: formData.email,
        membershipNumber: enrollmentData.custCode,
      });

      const info = await this.transporter.sendMail(mailOptions);
      logger.info("Welcome email sent successfully:", {
        messageId: info.messageId,
        to: formData.email,
        membershipNumber: enrollmentData.custCode,
      });

      return true;
    } catch (error) {
      logger.error("Error sending welcome email:", error);
      return false;
    }
  }
}

export default new EmailService();
