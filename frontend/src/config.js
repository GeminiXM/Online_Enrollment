/**
 * Configuration file for frontend application
 * Pulls values from environment variables
 */

const config = {
  // API URL from environment variable
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001',
};

export default config; 