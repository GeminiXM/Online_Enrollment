/**
 * Configuration file for frontend application
 * Pulls values from environment variables
 */

const config = {
  // API base URL - use proxy in development, relative path in production
  apiUrl: "/api",

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
