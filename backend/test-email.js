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
      membershipType: "I", // Individual membership code
      club: "Colorado Athletic Club - Denver",
      address: "123 Test St",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      cellPhone: "555-123-4567",
      dateOfBirth: "1990-01-01",
      monthlyDues: 89.99,
      serviceAddons: [
        { name: "Personal Training", price: 25.00 },
        { name: "Group Classes", price: 15.00 }
      ],
      requestedStartDate: "2025-09-27"
    };

    const testSignatureData = {
      signature: { text: "John Doe" },
      initials: { text: "JD" },
      selectedFont: { font: "Arial" },
    };

    const testSelectedClub = {
      name: "Colorado Athletic Club - Denver",
      state: "CO",
      address: "1234 Main Street, Denver, CO 80202",
      phone: "303-555-0123",
      email: "denver@coloradoathleticclub.com"
    };

    console.log("Sending test email...");
    const emailSent = await emailService.sendWelcomeEmail(
      testData,
      testFormData,
      testSignatureData,
      null, // No PDF buffer for this test
      testSelectedClub
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
