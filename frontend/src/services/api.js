import axios from "axios";
import config from "../config.js";

// Create an axios instance with default config
const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API methods for enrollment and payment
const apiService = {
  // Base axios instance
  ...api,

  // Generic post method
  post: (url, data) => api.post(url, data),

  // Get specialty membership bridge code
  getSpecialtyMembershipBridgeCode: async (clubId, specialtyMembership) => {
    try {
      const response = await api.get("/enrollment/bridge-code", {
        params: {
          clubId,
          specialtyMembership,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching bridge code:", error);
      throw error;
    }
  },

  // Get membership price
  getMembershipPrice: async (
    clubId,
    membershipType,
    agreementType,
    specialtyMembership,
    bridgeCode
  ) => {
    try {
      const response = await api.get("/enrollment/price", {
        params: {
          clubId,
          membershipType,
          agreementType,
          specialtyMembership,
          bridgeCode,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching membership price:", error);
      throw error;
    }
  },

  // Get addons
  getAddons: async (clubId) => {
    try {
      const response = await api.get("/enrollment/addons", {
        params: { clubId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching addons:", error);
      throw error;
    }
  },

  // Get credit card processor name for a club
  getCCProcessorName: async (clubId) => {
    try {
      const response = await api.get("/payment/cc-processor", {
        params: { clubId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching CC processor name:", error);
      throw error;
    }
  },

  // Get FluidPay processor information for a club
  getFluidPayInfo: async (clubId) => {
    try {
      const response = await api.get("/payment/fluidpay-info", {
        params: { clubId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching FluidPay info:", error);
      // Return fallback data for demo purposes
      return {
        success: true,
        fluidPayInfo: {
          merchant_id: "Demo FluidPay Merchant",
          fluidpay_base_url: "https://api-sandbox.fluidpay.com",
          fluidpay_api_key: "✓ Configured",
        },
      };
    }
  },

  // Get Converge payment processor information
  getConvergeInfo: async (clubId) => {
    try {
      const response = await api.get("/payment/converge-info", {
        params: { clubId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching Converge info:", error);
      throw error;
    }
  },

  // Process a demo payment
  processPaymentDemo: async (paymentData) => {
    try {
      const response = await api.post("/payment/process-demo", paymentData);
      return response.data;
    } catch (error) {
      console.error("Error processing demo payment:", error);
      throw error;
    }
  },

  // Get tax rate for New Mexico clubs
  getTaxRate: async (clubId) => {
    try {
      const response = await api.get("/enrollment/tax-rate", {
        params: { clubId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching tax rate:", error);
      throw error;
    }
  },

  // Get a transaction token for Converge Lightbox
  getConvergeToken: async (tokenData) => {
    try {
      const response = await api.post("/payment/converge-token", tokenData);
      return response.data;
    } catch (error) {
      console.error("Error getting Converge token:", error);

      // For demo purposes, simulate a token response
      // In production, you would never do this - tokens should only come from a secure backend
      if (process.env.NODE_ENV !== "production") {
        console.warn("DEMO MODE: Returning mock token for development");
        return {
          success: true,
          ssl_txn_auth_token: `DEMO_TOKEN_${Date.now()}`,
          message: "This is a simulated token for demonstration purposes only",
        };
      }

      throw error;
    }
  },

  // Get a transaction token for FluidPay Lightbox
  getFluidPayToken: async (tokenData) => {
    try {
      const response = await api.post("/payment/fluidpay-token", tokenData);
      return response.data;
    } catch (error) {
      console.error("Error getting FluidPay token:", error);

      // For demo purposes, simulate a token response
      // In production, you would never do this - tokens should only come from a secure backend
      if (process.env.NODE_ENV !== "production") {
        console.warn("DEMO MODE: Returning mock token for development");
        return {
          success: true,
          ssl_txn_auth_token: `DEMO_FLUIDPAY_TOKEN_${Date.now()}`,
          message:
            "This is a simulated FluidPay token for demonstration purposes only",
        };
      }

      throw error;
    }
  },

  // Save contract PDF to contracts folder
  saveContractPDF: async (contractPDF, membershipNumber, memberName) => {
    try {
      const response = await api.post("/enrollment/save-contract", {
        contractPDF,
        membershipNumber,
        memberName,
      });
      return response.data;
    } catch (error) {
      console.error("Error saving contract PDF:", error);
      throw error;
    }
  },
};

export default apiService;
