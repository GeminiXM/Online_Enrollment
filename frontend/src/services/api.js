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
      const response = await api.get('/enrollment/bridge-code', {
        params: {
          clubId,
          specialtyMembership
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching bridge code:', error);
      throw error;
    }
  },

  // Get membership price
  getMembershipPrice: async (clubId, membershipType, agreementType, specialtyMembership, bridgeCode) => {
    try {
      const response = await api.get('/enrollment/price', {
        params: {
          clubId,
          membershipType,
          agreementType,
          specialtyMembership,
          bridgeCode
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching membership price:', error);
      throw error;
    }
  },

  // Get addons
  getAddons: async (clubId) => {
    try {
      const response = await api.get('/enrollment/addons', {
        params: { clubId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching addons:', error);
      throw error;
    }
  },

  // Get credit card processor name for a club
  getCCProcessorName: async (clubId) => {
    try {
      const response = await api.get('/payment/cc-processor', {
        params: { clubId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching CC processor name:', error);
      throw error;
    }
  },

  // Get FluidPay payment processor information
  getFluidPayInfo: async (clubId) => {
    try {
      const response = await api.get('/payment/fluidpay-info', {
        params: { clubId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching FluidPay info:', error);
      throw error;
    }
  },

  // Get Converge payment processor information
  getConvergeInfo: async (clubId) => {
    try {
      const response = await api.get('/payment/converge-info', {
        params: { clubId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Converge info:', error);
      throw error;
    }
  },

  // Process a demo payment
  processPaymentDemo: async (paymentData) => {
    try {
      const response = await api.post('/payment/process-demo', paymentData);
      return response.data;
    } catch (error) {
      console.error('Error processing demo payment:', error);
      throw error;
    }
  },

  // Get tax rate for New Mexico clubs
  getTaxRate: async (clubId) => {
    try {
      const response = await api.get('/enrollment/tax-rate', {
        params: { clubId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tax rate:', error);
      throw error;
    }
  }
};

export default apiService;
