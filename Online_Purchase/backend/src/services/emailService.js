"use strict";

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.js";

// Load env (local or fallback)
(() => {
  try {
    const localEnv = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(localEnv)) {
      dotenv.config({ path: localEnv });
      return;
    }
    const fallbackEnv = path.resolve(
      process.cwd(),
      "..",
      "..",
      "backend",
      ".env"
    );
    if (fs.existsSync(fallbackEnv)) {
      dotenv.config({ path: fallbackEnv });
    } else {
      dotenv.config();
    }
  } catch {
    dotenv.config();
  }
})();

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async init() {
    if (this.transporter) return;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "25"),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  async sendPTPurchaseReceipt(member, ptPackage, payment, club) {
    try {
      await this.init();
      const DEFAULT_FROM =
        process.env.SMTP_FROM_PURCHASE ||
        process.env.SMTP_FROM ||
        "onlinesales@wellbridge.com";
      const displayName = [member.firstName, member.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || (member.membershipName || "");
      const toRecipients = [member.email].filter(Boolean);
      const ccRecipients = [];
      const bccRecipients = [];

      // PT Manager/Regional – simplified derivation: use GM email domain pattern if available
      const ptManagerEmail = club?.ptManagerEmail || club?.email || null;
      if (ptManagerEmail) {
        ccRecipients.push(ptManagerEmail);
      }

      const subject = `PT Purchase Receipt - ${club?.name || "Club"} - ${
        member.firstName
      } ${member.lastName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; line-height: 1.6;">
          <h2 style="margin:0 0 10px 0; color:#2c3e50;">Thank you for your purchase!</h2>
          <p style="margin:0 0 16px 0;">We received your order for the New Intro Personal Training Package.</p>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Member:</strong> #${member.membershipNumber}</div>
            <div><strong>Membership Name:</strong> ${member.membershipName || ""}</div>
            <div><strong>Email:</strong> ${member.email || ""}</div>
            <div><strong>Club:</strong> ${club?.name || ""}${club?.state ? ` (${club.state})` : ""}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Package:</strong> ${
              ptPackage?.description || "New Intro Personal Training Package"
            }</div>
            <div><strong>Price:</strong> $${Number(
              ptPackage?.price || ptPackage?.invtr_price || 149
            ).toFixed(2)}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#eef6ff; border:1px solid #cfe1ff;">
            <div><strong>Club Transaction #:</strong> ${payment?.dbTransactionId || ""}</div>
          </div>
          <p style="margin:16px 0 0 0;">A PT Manager will contact you within 24 hours to get you started.</p>
        </div>
      `;

      const mailOptions = {
        from: DEFAULT_FROM,
        to: toRecipients.join(", "),
        cc: ccRecipients.length ? ccRecipients.join(", ") : undefined,
        bcc: bccRecipients.length ? bccRecipients.join(", ") : undefined,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info("PT receipt email sent", {
        to: toRecipients,
        cc: ccRecipients,
        messageId: info?.messageId,
      });
      return true;
    } catch (error) {
      logger.error("PT receipt email failed", { error: error.message });
      return false;
    }
  }

  async sendPreviewReceipt(toEmail, receipt, club) {
    try {
      await this.init();
      const DEFAULT_FROM =
        process.env.SMTP_FROM_PURCHASE ||
        process.env.SMTP_FROM ||
        "onlinesales@wellbridge.com";
      const to = toEmail || "mmoore@wellbridge.com";
      const subject = `PT Purchase Receipt Preview - ${club?.name || "Club"}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; line-height: 1.6;">
          <h2 style="margin:0 0 10px 0; color:#2c3e50;">Thank you for your purchase!</h2>
          <p style="margin:0 0 16px 0;">We received your order for the New Intro Personal Training Package.</p>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Member:</strong> #${receipt?.membershipNumber || ""}</div>
            <div><strong>Membership Name:</strong> ${receipt?.membershipName || ""}</div>
            <div><strong>Email:</strong> ${receipt?.email || ""}</div>
            <div><strong>Club:</strong> ${club?.name || ""}${club?.state ? ` (${club.state})` : ""}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Package:</strong> ${receipt?.description || ""}</div>
            <div><strong>Price:</strong> $${Number(receipt?.price || 0).toFixed(2)}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#eef6ff; border:1px solid #cfe1ff;">
            <div><strong>Club Transaction #:</strong> ${receipt?.dbTransactionId || ""}</div>
          </div>
          <p style="margin:16px 0 0 0;">A PT Manager will contact you within 24 hours to get you started.</p>
        </div>
      `;

      const info = await this.transporter.sendMail({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
      });
      logger.info("Preview receipt email sent", { to, messageId: info?.messageId });
      return true;
    } catch (error) {
      logger.error("Preview receipt email failed", { error: error.message });
      return false;
    }
  }

  async sendPreviewPTInternal(toEmail, member, ptPackage, club, receiptEmail, dbTransactionId = "", contactInfo = {}) {
    try {
      await this.init();
      const DEFAULT_FROM =
        process.env.SMTP_FROM_PURCHASE ||
        process.env.SMTP_FROM ||
        "onlinesales@wellbridge.com";
      const to = toEmail || "mmoore@wellbridge.com";
      const subject = `PT Purchase Notification (Preview) - ${club?.name || "Club"} - #${member?.membershipNumber || ""}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; line-height: 1.6;">
          <h2 style="margin:0 0 10px 0; color:#2c3e50;">Member Purchased Personal Training</h2>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Membership #:</strong> ${member?.membershipNumber || ""}</div>
            <div><strong>Membership Name:</strong> ${member?.membershipName || ""}</div>
            <div><strong>Club:</strong> ${club?.name || ""} ${club?.state ? `(${club.state})` : ""}</div>
            <div><strong>Email (entered for receipt):</strong> ${receiptEmail || ""}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#eef6ff; border:1px solid #cfe1ff;">
            <div><strong>Contact Information</strong></div>
            <div><strong>Name:</strong> ${contactInfo?.name || ""}</div>
            <div><strong>Preferred Phone:</strong> ${contactInfo?.phone || ""}</div>
            <div><strong>Email:</strong> ${contactInfo?.email || ""}</div>
            <div><strong>Looking to achieve:</strong> ${contactInfo?.goals || ""}</div>
            <div><strong>Preferred Trainer Name:</strong> ${contactInfo?.preferredTrainer || ""}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#eef6ff; border:1px solid #cfe1ff;">
            <div><strong>Club Transaction #:</strong> ${dbTransactionId || ""}</div>
          </div>
          <div style="margin:12px 0; padding:12px; background:#f7f7f7; border:1px solid #e2e2e2;">
            <div><strong>Package:</strong> ${ptPackage?.description || "PT Package"}</div>
            <div><strong>Price:</strong> $${Number(ptPackage?.price || 0).toFixed(2)}</div>
          </div>
          <p style="margin:16px 0 0 0; color:#2c3e50;">
            Please contact this member within 24 hours to welcome them and arrange next steps for using this purchase.
          </p>
        </div>
      `;

      const info = await this.transporter.sendMail({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
      });
      logger.info("Preview internal PT notification sent", { to, messageId: info?.messageId });
      return true;
    } catch (error) {
      logger.error("Preview internal PT notification failed", { error: error.message });
      return false;
    }
  }
}

export default new EmailService();
