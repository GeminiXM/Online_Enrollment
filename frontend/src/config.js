/**
 * Configuration file for frontend application
 * Pulls values from environment variables
 */

const config = {
  // API base URL - automatically uses the correct URL based on environment
  apiUrl:
    process.env.NODE_ENV === "production"
      ? "/api" // In production, use relative path (handled by proxy)
      : window.location.hostname === "localhost" 
        ? "http://localhost:5001/api" // When accessed locally
        : `http://${window.location.hostname}:5001/api`, // When accessed from another computer

  // Application name
  appName: "Fitness Facility Enrollment",

  // Security settings
  security: {
    // Token expiration time in minutes
    tokenExpirationMinutes: 60,

    // CSRF protection enabled
    csrfProtection: true,
  },

  // Feature flags
  features: {
    // Enable or disable specific features
    enableFamilyMembers: true,
    enableMembershipOptions: true,
    enablePaymentProcessing: false, // Not implemented yet
  },

  // Contact information
  contact: {
    phone: "(555) 123-4567",
    email: "support@fitnessfacility.com",
    address: "123 Fitness Way, Healthville, CA 90210",
  },
};

export default config;
