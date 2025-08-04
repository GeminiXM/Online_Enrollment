import dotenv from "dotenv";
import emailService from "./src/services/emailService.js";

// Load environment variables
dotenv.config();

async function testEmail() {
  try {
    console.log("Testing email configuration...");
    console.log("SMTP Host:", process.env.SMTP_HOST || "wellbridge.prxy.com");
    console.log("SMTP Port:", process.env.SMTP_PORT || 25);
    console.log(
      "SMTP User:",
      process.env.SMTP_USER || "onlineenrollment@wellbridge.com"
    );

    const testData = {
      custCode: "TEST001",
      transactionId: "TEST_TXN_123",
      amountBilled: 99.99,
    };

    const testFormData = {
      firstName: "John",
      lastName: "Doe",
      email: "mmoore@wellbridge.com",
      membershipType: "Individual",
      club: "Test Club",
      address: "123 Test St",
      city: "Test City",
      state: "TX",
      zipCode: "12345",
      cellPhone: "555-123-4567",
      dateOfBirth: "1990-01-01",
    };

    const testSignatureData = {
      signature: { text: "John Doe" },
      initials: { text: "JD" },
      selectedFont: { font: "Arial" },
    };

    console.log("Sending test email...");
    const emailSent = await emailService.sendWelcomeEmail(
      testData,
      testFormData,
      testSignatureData
    );

    if (emailSent) {
      console.log("✅ Test email sent successfully!");
    } else {
      console.log("❌ Failed to send test email");
    }
  } catch (error) {
    console.error("❌ Error testing email:", error.message);
    console.error("Full error:", error);
  }
}

testEmail();
