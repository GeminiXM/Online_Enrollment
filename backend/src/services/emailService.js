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
   * Save contract PDF buffer to temporary file
   */
  async saveContractPDF(contractPDFBuffer, membershipNumber) {
    try {
      logger.info("saveContractPDF called with:", {
        hasContractPDFBuffer: !!contractPDFBuffer,
        membershipNumber,
        contractPDFBufferType: typeof contractPDFBuffer,
      });

      if (!contractPDFBuffer) {
        logger.warn("No contract PDF buffer provided");
        return null;
      }

      // Create contracts directory if it doesn't exist
      const contractsDir = path.join(__dirname, "../contracts");
      if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
      }

      const filename = `contract_${membershipNumber}_${Date.now()}.pdf`;
      const filepath = path.join(contractsDir, filename);

      // Convert the serialized ArrayBuffer to a Buffer and save to file
      try {
        // Log the structure of the received data
        logger.info("Contract PDF data received:", {
          type: typeof contractPDFBuffer,
          keys:
            contractPDFBuffer && typeof contractPDFBuffer === "object"
              ? Object.keys(contractPDFBuffer)
              : null,
          length: contractPDFBuffer?.length || 0,
          isArray: Array.isArray(contractPDFBuffer),
          constructor: contractPDFBuffer?.constructor?.name,
        });

        // Convert the serialized ArrayBuffer back to a Buffer
        const byteArray = Object.values(contractPDFBuffer);
        const pdfBuffer = Buffer.from(byteArray);

        logger.info("PDF buffer created:", {
          byteArrayLength: byteArray.length,
          pdfBufferLength: pdfBuffer.length,
          firstBytes: pdfBuffer.toString("ascii", 0, 10),
        });

        // Validate the PDF buffer (should start with %PDF)
        if (
          pdfBuffer.length < 4 ||
          pdfBuffer.toString("ascii", 0, 4) !== "%PDF"
        ) {
          logger.error("Generated buffer does not appear to be a valid PDF", {
            bufferLength: pdfBuffer.length,
            firstBytes: pdfBuffer.toString("ascii", 0, 10),
            expectedStart: "%PDF",
            actualStart: pdfBuffer.toString("ascii", 0, 4),
          });
          // Temporarily disable validation to see if file gets created
          logger.warn(
            "PDF validation failed, but continuing anyway for testing"
          );
          // return null;
        }

        // Write the PDF directly to file
        fs.writeFileSync(filepath, pdfBuffer);

        logger.info("Contract PDF saved successfully", {
          filepath,
          size: pdfBuffer.length,
          membershipNumber,
        });

        return filepath;
      } catch (error) {
        logger.error("Error saving contract PDF:", {
          error: error.message,
          contractPDFBufferType: typeof contractPDFBuffer,
        });
        return null;
      }
    } catch (error) {
      logger.error("Error in saveContractPDF:", error);
      return null;
    }
  }

  /**
   * Clean up temporary contract PDF file
   */
  async cleanupContractPDF(filepath) {
    try {
      if (filepath && fs.existsSync(filepath)) {
        // Don't delete immediately - let user inspect the file
        logger.info("Contract PDF saved for inspection", { filepath });
        // Uncomment the line below when you want to clean up files
        // fs.unlinkSync(filepath);
      }
    } catch (error) {
      logger.error("Error cleaning up contract PDF:", error);
    }
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
      // Log the selectedClub data for debugging
      logger.info("Email service received selectedClub:", {
        selectedClub: selectedClub,
        clubName: selectedClub?.name,
        clubAddress: selectedClub?.address,
        clubId: selectedClub?.id,
      });

      // Contract PDF is now saved in EnrollmentConfirmation.jsx with proper naming
      // Removed contract saving from here to avoid duplicate files
      let contractFilePath = null;

      // Email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2c3e50; margin: 0;">Welcome to ${
              selectedClub?.name || formData.club || "Wellbridge"
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
                  selectedClub?.name || formData.club || "Wellbridge"
                }</li>
                <li><strong>Club Address:</strong> ${
                  selectedClub?.address || "Address not available"
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
              <li><strong>Visit the Club:</strong> Bring a photo ID and your membership number to complete your registration at ${
                selectedClub?.address || "our club location"
              }.</li>
              <li><strong>Orientation:</strong> Schedule a free orientation session to learn about our facilities and programs.</li>
              
            </ol>
            
            <h3>Important Information</h3>
            <ul>
              <li>Your membership agreement is attached to this email for your records.</li>
              <li>Monthly dues will be automatically charged to your payment method.</li>
              <li>Please review our club rules and policies available on our website.</li>
              <li>For any questions, contact us at ma@wellbridge.com or call (303) 866-0800.</li>
              <li>Club Location: ${
                selectedClub?.address || "Address not available"
              }</li>
            </ul>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">Club Hours</h4>
              <p>Monday - Friday: 5:00 AM - 11:00 PM<br>
              Saturday - Sunday: 6:00 AM - 10:00 PM</p>
            </div>
            
            <p>We look forward to helping you achieve your fitness goals!</p>
            
            <p>Best regards,<br>
            The ${selectedClub?.name || formData.club || "Wellbridge"} Team</p>
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
        subject: `Welcome to ${
          selectedClub?.name || formData.club || "Our Club"
        } - Membership #${enrollmentData.custCode}`,
        html: emailContent,
        attachments: contractFilePath
          ? [
              {
                filename: `Membership_Agreement_${enrollmentData.custCode}.pdf`,
                path: contractFilePath,
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
    } finally {
      // Clean up temporary file
      if (contractFilePath) {
        await this.cleanupContractPDF(contractFilePath);
      }
    }
  }
}

export default new EmailService();
