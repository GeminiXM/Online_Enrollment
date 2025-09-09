// frontend/src/services/dataPersistence.js
// Data persistence service for enrollment form data

import api from "./api.js";

// Simple encryption/decryption for localStorage data
// In production, you'd want more robust encryption
const encryptData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Simple base64 encoding - in production use proper encryption
    return btoa(jsonString);
  } catch (error) {
    console.error("Error encrypting data:", error);
    return null;
  }
};

const decryptData = (encryptedData) => {
  try {
    // Simple base64 decoding - in production use proper decryption
    const jsonString = atob(encryptedData);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decrypting data:", error);
    return null;
  }
};

// Generate a unique session ID
const generateSessionId = () => {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("enrollment_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("enrollment_session_id", sessionId);
  }
  return sessionId;
};

// Auto-save form data to localStorage
export const autoSaveFormData = (formData, additionalData = {}) => {
  try {
    const sessionId = getSessionId();
    const dataToSave = {
      sessionId,
      formData,
      additionalData,
      timestamp: Date.now(),
      version: "1.0",
    };

    const encrypted = encryptData(dataToSave);
    if (encrypted) {
      localStorage.setItem("enrollment_draft", encrypted);
      console.log("Form data auto-saved successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error auto-saving form data:", error);
    return false;
  }
};

// Restore form data from localStorage
export const restoreFormData = () => {
  try {
    console.log("Attempting to restore from localStorage...");
    const encrypted = localStorage.getItem("enrollment_draft");
    if (!encrypted) {
      console.log("No encrypted data found in localStorage");
      return null;
    }

    console.log("Found encrypted data, attempting to decrypt...");
    const decrypted = decryptData(encrypted);
    if (!decrypted) {
      console.log("Failed to decrypt data, clearing corrupted data");
      localStorage.removeItem("enrollment_draft");
      return null;
    }

    console.log("Data decrypted successfully:", decrypted);

    // Check if data is from current session
    const currentSessionId = getSessionId();
    console.log("Current session ID:", currentSessionId);
    console.log("Data session ID:", decrypted.sessionId);

    // Allow restoration even if session ID is different (user might have refreshed or reopened browser)
    // Only clear data if it's from a completely different browser session (different timestamp pattern)
    if (decrypted.sessionId && decrypted.sessionId !== currentSessionId) {
      console.log(
        "Session ID different, but allowing restoration for user convenience"
      );
      // Don't clear the data - allow restoration
    }

    // Check if data is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const dataAge = Date.now() - decrypted.timestamp;
    console.log("Data age:", dataAge, "ms (max:", maxAge, "ms)");

    if (dataAge > maxAge) {
      console.log("Data too old, clearing");
      localStorage.removeItem("enrollment_draft");
      return null;
    }

    console.log("Form data restored successfully from localStorage");
    return {
      formData: decrypted.formData,
      additionalData: decrypted.additionalData,
    };
  } catch (error) {
    console.error("Error restoring form data:", error);
    localStorage.removeItem("enrollment_draft");
    return null;
  }
};

// Save draft to backend
export const saveDraftToBackend = async (formData, additionalData = {}) => {
  try {
    const sessionId = getSessionId();
    const draftData = {
      sessionId,
      formData,
      additionalData,
      timestamp: Date.now(),
    };

    console.log("Saving draft to backend:", {
      sessionId,
      dataSize: JSON.stringify(draftData).length,
    });
    const response = await api.post("/enrollment/draft", draftData);
    console.log("Backend response:", response);

    if (response.data && response.data.success) {
      console.log("Draft saved to backend successfully");
      return true;
    } else {
      console.error(
        "Failed to save draft to backend:",
        response.data?.message || "Unknown error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error saving draft to backend:", error);
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("Network Error")
    ) {
      console.warn("Backend server appears to be offline");
    }
    return false;
  }
};

// Restore draft from backend
export const restoreDraftFromBackend = async () => {
  try {
    const sessionId = getSessionId();
    const response = await api.get(`/enrollment/draft/${sessionId}`);

    console.log("Backend restore response:", response);

    if (response.data && response.data.success && response.data.draft) {
      console.log("Draft restored from backend successfully");
      return {
        formData: response.data.draft.formData,
        additionalData: response.data.draft.additionalData,
      };
    }
    return null;
  } catch (error) {
    console.error("Error restoring draft from backend:", error);
    return null;
  }
};

// Clear all saved data
export const clearSavedData = async () => {
  try {
    const sessionId = getSessionId();

    // Clear from localStorage
    localStorage.removeItem("enrollment_draft");
    sessionStorage.removeItem("enrollment_session_id");

    // Clear from backend
    try {
      await api.delete(`/enrollment/draft/${sessionId}`);
    } catch (error) {
      console.warn("Could not clear draft from backend:", error);
    }

    console.log("All saved data cleared");
    return true;
  } catch (error) {
    console.error("Error clearing saved data:", error);
    return false;
  }
};

// Check if there's saved data available
export const hasSavedData = () => {
  try {
    const encrypted = localStorage.getItem("enrollment_draft");
    if (!encrypted) return false;

    const decrypted = decryptData(encrypted);
    if (!decrypted) return false;

    const currentSessionId = getSessionId();
    // Allow checking for saved data even if session ID is different
    // if (decrypted.sessionId !== currentSessionId) return false;

    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - decrypted.timestamp > maxAge) return false;

    return true;
  } catch (error) {
    return false;
  }
};

// Get session info
export const getSessionInfo = () => {
  return {
    sessionId: getSessionId(),
    hasSavedData: hasSavedData(),
  };
};
