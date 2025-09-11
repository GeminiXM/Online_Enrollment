import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './ConvergeHPP.css';

// Cloudflare tunnel configuration for Converge HPP
// Update this URL to match your Cloudflare tunnel for the backend
const BACKEND_HTTPS = process.env.REACT_APP_BACKEND_HTTPS || 'https://frederick-pam-ones-testing.trycloudflare.com';

// Helper function to pick specific fields from an object
function pick(v, ...keys) {
  if (!v) return {};
  const out = {};
  keys.forEach(k => { if (v[k] != null) out[k] = v[k]; });
  return out;
}

// Helper function to interpret Converge payment results
function interpretResult(r) {
  const data = r?.data || r || {};
  const approved = !!(data.ssl_approval_code || (data.ssl_result_message && /approved/i.test(data.ssl_result_message)));
  const declined = !!(data.ssl_result_message && /declin/i.test(data.ssl_result_message));
  const hasToken = !!(data.ssl_token || data.token);
  const status =
    approved ? "APPROVED" :
    declined ? "DECLINED" :
    r?.error ? "ERROR" :
    "UNKNOWN";
  return {
    status,
    approved,
    declined,
    hasToken,
    fields: pick(
      data,
      "ssl_result", "ssl_result_message", "ssl_approval_code",
      "ssl_transaction_id", "ssl_card_type", "ssl_last4",
      "ssl_avs_response", "ssl_cvv2_response", "ssl_token", "ssl_amount"
    )
  };
}

const ConvergeHPP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // State management
  const [formData, setFormData] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null);   // {title, summary, details, raw}
  const [vaultToken, setVaultToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const safetyTimer = useRef(null);

  // Calculate prorated amount for payment
  const calculateProratedAmount = () => {
    if (!formData?.membershipDetails) return 0;
    
    const membership = formData.membershipDetails;
    const baseAmount = parseFloat(membership.amount || 0);
    const prorationAmount = parseFloat(membership.prorationAmount || 0);
    const totalAmount = baseAmount + prorationAmount;
    
    return totalAmount;
  };

  // Load form data from location state
  useEffect(() => {
    if (location.state?.formData) {
      console.log('Using form data from location state');
      setFormData(location.state.formData);
      console.log('Location state family members:', location.state.familyMembers || []);
    } else {
      console.log('No form data in location state, navigating back to enrollment');
      navigate('/enrollment');
    }
  }, [location, navigate]);

  // Initialize Converge HPP script and event listeners
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://api.convergepay.com/hosted-payments/PayWithConverge.js';
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => {
      console.error('Failed to load Converge JS (check HTTPS + Allowed Referrers)');
      setPanel({
        title: 'Script load error',
        summary: 'Could not load PayWithConverge.js. Ensure your page is HTTPS and your frontend origin is whitelisted in Converge.',
        details: {},
        raw: null
      });
    };
    document.head.appendChild(s);

    // Add global event listeners to capture Converge postMessage events
    const handleMessage = (event) => {
      console.log("Window message received:", event.data, event.origin);
      
      // Check if this is from Converge iframe
      if (event.origin && event.origin.includes('convergepay.com')) {
        console.log("Message from Converge iframe:", event.data);
      }
      
      // Handle Converge postMessage responses
      if (event.data && event.data.converge === true) {
        console.log("CONVERGE POSTMESSAGE RESPONSE:", event.data);
        
        // Skip ready messages - these are just initialization, not payment responses
        if (event.data.ready === true) {
          console.log("Converge ready signal received - ignoring");
          return;
        }
        
        console.log("Full event object:", event);
        console.log("Event origin:", event.origin);
        console.log("Event source:", event.source);
        
        const { approved, cancelled, errored, error, response } = event.data;
        
        // Log all available fields in the event data
        console.log("Available fields in event.data:", Object.keys(event.data));
        console.log("Response field:", response);
        console.log("Error field:", error);
        
        // Check for any additional fields that might contain decline info
        Object.keys(event.data).forEach(key => {
          if (key !== 'converge' && key !== 'approved' && key !== 'cancelled' && key !== 'errored' && key !== 'error' && key !== 'response' && key !== 'ready') {
            console.log(`Additional field ${key}:`, event.data[key]);
          }
        });
        
        if (cancelled) {
          console.error("PAYMENT CANCELLED VIA POSTMESSAGE:", event.data);
          showPanel("CANCELLED", "Payment was cancelled by user.", event.data, event.data);
          clearBusy();
        } else if (errored) {
          console.error("PAYMENT ERROR VIA POSTMESSAGE:", event.data);
          showPanel("ERROR", `Payment error: ${error || 'Unknown error'}`, event.data, event.data);
          clearBusy();
        } else if (response) {
          // Process any payment response (approved or declined)
          console.log("PAYMENT RESPONSE VIA POSTMESSAGE:", event.data);
          
          // Check if this is an error response
          if (response.errorName || response.errorMessage || response.errorCode) {
            console.error("PAYMENT ERROR VIA POSTMESSAGE:", {
              errorName: response.errorName,
              errorMessage: response.errorMessage,
              errorCode: response.errorCode,
              fullResponse: response
            });
            
            showPanel(
              "ERROR",
              `Payment failed: ${response.errorMessage || response.errorName || 'Unknown error'}`,
              response,
              event.data
            );
            clearBusy();
            return;
          }
          
          const info = interpretResult(response);
          const r = response?.data || response || {};
          const token = r.ssl_token || r.token;
          const txnId = r.ssl_transaction_id || r.transactionId;

          // Enhanced logging for all payment responses
          if (info.declined) {
            console.error("PAYMENT DECLINED VIA POSTMESSAGE:", {
              status: info.status,
              resultMessage: r.ssl_result_message,
              resultCode: r.ssl_result,
              approvalCode: r.ssl_approval_code,
              transactionId: txnId,
              cardType: r.ssl_card_type,
              last4: r.ssl_last4,
              avsResponse: r.ssl_avs_response,
              cvv2Response: r.ssl_cvv2_response,
              fullResponse: r
            });
          } else if (info.approved) {
            console.log("PAYMENT APPROVED VIA POSTMESSAGE:", {
              status: info.status,
              approvalCode: r.ssl_approval_code,
              transactionId: txnId,
              cardType: r.ssl_card_type,
              last4: r.ssl_last4
            });
          }

          // Log payment response to backend for debugging
          try {
            api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/log-payment-response`, {
              status: info.status,
              result: r,
              customerId: formData?.firstName + ' ' + formData?.lastName,
              amount: calculateProratedAmount(),
              timestamp: new Date().toISOString(),
              clubId: selectedClub?.id
            });
          } catch (logErr) {
            console.warn("Failed to log payment response:", logErr);
          }

          if (token) {
            setVaultToken(token);
            // Store vault token using the new endpoint
            api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/store-vault-token`, {
              customerId: formData?.firstName + ' ' + formData?.lastName,
              vaultToken: token,
              transactionId: txnId,
              amount: calculateProratedAmount(),
              clubId: selectedClub?.id,
              memberData: {
                firstName: formData?.firstName,
                lastName: formData?.lastName,
                email: formData?.email,
                phone: formData?.phone,
                address: formData?.address,
                city: formData?.city,
                state: formData?.state,
                zipCode: formData?.zipCode
              }
            });
          }

          showPanel(
            info.status,
            info.approved
              ? "Payment approved."
              : info.declined
              ? `Payment declined. Reason: ${r.ssl_result_message || 'Unknown reason'}`
              : info.hasToken
              ? "Payment processed; token captured."
              : "See details below.",
            info.fields,
            response
          );
          clearBusy();
        } else {
          // Handle case where we have a response but it's not in the expected format
          console.log("PAYMENT RESPONSE WITHOUT EXPECTED FORMAT:", event.data);
          
          // Check if there are any other fields that might contain the response
          const possibleResponseFields = ['result', 'data', 'transaction', 'payment', 'result_data'];
          possibleResponseFields.forEach(field => {
            if (event.data[field]) {
              console.log(`Found potential response in field '${field}':`, event.data[field]);
              const info = interpretResult(event.data[field]);
              const r = event.data[field]?.data || event.data[field] || {};
              
              if (info.declined) {
                console.error("PAYMENT DECLINED (from alternative field):", {
                  field,
                  status: info.status,
                  resultMessage: r.ssl_result_message,
                  resultCode: r.ssl_result,
                  approvalCode: r.ssl_approval_code,
                  transactionId: r.ssl_transaction_id,
                  cardType: r.ssl_card_type,
                  last4: r.ssl_last4,
                  avsResponse: r.ssl_avs_response,
                  cvv2Response: r.ssl_cvv2_response,
                  fullResponse: r
                });
                
                showPanel(
                  info.status,
                  `Payment declined. Reason: ${r.ssl_result_message || 'Unknown reason'}`,
                  info.fields,
                  event.data[field]
                );
                clearBusy();
              }
            }
          });
        }
      }
    };
    
    const handleStorageChange = (event) => {
      console.log("Storage change:", event.key, event.newValue);
    };

    // Add keyboard escape handler
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && busy) {
        console.log("Escape key pressed - cancelling payment");
        clearBusy();
        showPanel("Cancelled", "Payment was cancelled via Escape key.", {}, null);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.head.removeChild(s);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, formData, selectedClub]);

  const clearBusy = () => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    setBusy(false);
  };

  const showPanel = (title, summary, details, raw) => {
    setPanel({ title, summary, details, raw });
  };

  const handlePay = async () => {
    try {
      if (!window.PayWithConverge) {
        showPanel("Init error", "Hosted Payments script not loaded.", {}, null);
        return;
      }

      setBusy(true);

      // Safety net: if callbacks never fire, unstick the UI
      safetyTimer.current = setTimeout(() => {
        console.error("Payment modal timed out after 120 seconds");
        showPanel("Timed out", "Hosted Payments modal did not respond within 120s. You may need to refresh the page.", {}, null);
        clearBusy();
      }, 120000);

      // 1) Ask backend for session token
      console.log("Requesting session token from backend...");
      const { data } = await api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/session-token`, {
        amount: calculateProratedAmount().toFixed(2),
        orderId: `INV-${Date.now()}`,
        customerId: formData?.firstName + ' ' + formData?.lastName,
        clubId: selectedClub?.id,
        addToken: true,
        memberData: {
          firstName: formData?.firstName,
          lastName: formData?.lastName,
          email: formData?.email,
          phone: formData?.phone,
          address: formData?.address,
          city: formData?.city,
          state: formData?.state,
          zipCode: formData?.zipCode
        }
      });

      console.log("Session token response:", data);

      if (!data?.ssl_txn_auth_token) {
        console.error("No session token received:", data);
        showPanel("Init error", "No session token received from backend.", data, data);
        clearBusy();
        return;
      }

      console.log("Session token received successfully:", data.ssl_txn_auth_token);
      console.log("Session token length:", data.ssl_txn_auth_token?.length);
      console.log("Session token preview:", data.ssl_txn_auth_token?.substring(0, 20) + "...");

      // 2) Open Converge modal
      const fields = { 
        ssl_txn_auth_token: data.ssl_txn_auth_token
      };

      console.log("Opening Converge modal with fields:", fields);
      console.log("PayWithConverge object:", window.PayWithConverge);
      console.log("About to call PayWithConverge.open...");
      
      window.PayWithConverge.open(
        fields,
        async (result) => {
          try {
            console.log("HPP SUCCESS CALLBACK TRIGGERED:", result);
            console.log("Success callback - this means payment was processed");
            const info = interpretResult(result);
            const r = result?.data || result || {};
            const token = r.ssl_token || r.token;
            const txnId = r.ssl_transaction_id || r.transactionId;

            // Enhanced logging for declined payments
            if (info.declined) {
              console.error("PAYMENT DECLINED:", {
                status: info.status,
                resultMessage: r.ssl_result_message,
                resultCode: r.ssl_result,
                approvalCode: r.ssl_approval_code,
                transactionId: txnId,
                cardType: r.ssl_card_type,
                last4: r.ssl_last4,
                avsResponse: r.ssl_avs_response,
                cvv2Response: r.ssl_cvv2_response,
                fullResponse: r
              });
            } else if (info.approved) {
              console.log("PAYMENT APPROVED:", {
                status: info.status,
                approvalCode: r.ssl_approval_code,
                transactionId: txnId,
                cardType: r.ssl_card_type,
                last4: r.ssl_last4
              });
            }

            // Log payment response to backend for debugging
            try {
              await api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/log-payment-response`, {
                status: info.status,
                result: r,
                customerId: formData?.firstName + ' ' + formData?.lastName,
                amount: calculateProratedAmount(),
                timestamp: new Date().toISOString(),
                clubId: selectedClub?.id
              });
            } catch (logErr) {
              console.warn("Failed to log payment response:", logErr);
            }

            if (token) {
              setVaultToken(token);
              await api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/store-vault-token`, {
                customerId: formData?.firstName + ' ' + formData?.lastName,
                vaultToken: token,
                transactionId: txnId,
                amount: calculateProratedAmount(),
                clubId: selectedClub?.id,
                memberData: {
                  firstName: formData?.firstName,
                  lastName: formData?.lastName,
                  email: formData?.email,
                  phone: formData?.phone,
                  address: formData?.address,
                  city: formData?.city,
                  state: formData?.state,
                  zipCode: formData?.zipCode
                }
              });
            }

            showPanel(
              info.status,
              info.approved
                ? "Payment approved."
                : info.declined
                ? `Payment declined. Reason: ${r.ssl_result_message || 'Unknown reason'}`
                : info.hasToken
                ? "Payment processed; token captured."
                : "See details below.",
              info.fields,
              result
            );
          } catch (err) {
            showPanel("Success handler error", String(err?.message || err), {}, result);
          } finally {
            clearBusy();
          }
        },
        (err) => {
          console.error("HPP ERROR/CANCEL CALLBACK TRIGGERED:", err);
          console.log("Error/Cancel callback - this means payment failed or was cancelled");
          const details = (err && typeof err === "object") ? err : { message: String(err) };
          showPanel("Canceled / Error", details.errorText || details.error || "User canceled or modal error.", details, err);
          clearBusy();
        }
      );
    } catch (e) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      const summary =
        status
          ? `Init failed (HTTP ${status}). ${body?.hint ? body.hint : ""}`
          : "Init failed (network or CORS). See details.";
      showPanel("Init error", summary.trim(), body || { message: e.message }, body);
      clearBusy();
    }
  };

  // Handle back button
  const handleBack = () => {
    navigate('/contract', { state: { formData } });
  };
  
  if (!formData) {
    return (
      <div className="converge-hpp-page">
        <div className="loading">Loading payment information...</div>
      </div>
    );
  }

  return (
    <div className="converge-hpp-page">
      <div className="payment-header">
        <h1>Payment Processing</h1>
        <p>Complete your membership enrollment with secure payment processing</p>
      </div>

      <div className="payment-summary">
        <h2>Payment Summary</h2>
        <div className="summary-details">
          <div className="member-info">
            <h3>Member Information</h3>
            <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Phone:</strong> {formData.phone}</p>
          </div>
          
          <div className="membership-info">
            <h3>Membership Details</h3>
            <p><strong>Type:</strong> {formData.membershipDetails?.description || 'Standard Membership'}</p>
            <p><strong>Base Amount:</strong> ${parseFloat(formData.membershipDetails?.amount || 0).toFixed(2)}</p>
            {formData.membershipDetails?.prorationAmount && parseFloat(formData.membershipDetails.prorationAmount) > 0 && (
              <p><strong>Proration:</strong> ${parseFloat(formData.membershipDetails.prorationAmount).toFixed(2)}</p>
            )}
            <p className="total-amount"><strong>Total Amount:</strong> ${calculateProratedAmount().toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="payment-section">
        <h2>Secure Payment</h2>
        <p>Click the button below to open the secure payment form. Your payment information is processed securely through Converge.</p>
        
        <button 
          onClick={handlePay} 
          disabled={!ready || busy}
          className="pay-button"
        >
          {busy ? "Processing…" : `Pay $${calculateProratedAmount().toFixed(2)}`}
        </button>
        
        {busy && (
          <>
            {/* Regular cancel button below the pay button */}
            <div className="cancel-section">
              <div className="cancel-message">
                Payment processing... If the modal is stuck, you can:
              </div>
              <button 
                onClick={() => {
                  console.log("Manual close requested");
                  clearBusy();
                  showPanel("Manually Closed", "Payment was manually cancelled.", {}, null);
                }}
                className="cancel-button"
              >
                Cancel Payment
              </button>
            </div>
            
            {/* Floating emergency cancel button */}
            <div className="emergency-cancel"
              onClick={() => {
                console.log("Emergency cancel requested");
                clearBusy();
                showPanel("Emergency Cancelled", "Payment was cancelled via emergency button.", {}, null);
              }}
            >
              🚨 EMERGENCY CANCEL
            </div>
          </>
        )}
      </div>

      {panel && (
        <div className={`payment-result ${panel.title === "DECLINED" ? "declined" : panel.title === "APPROVED" ? "approved" : ""}`}>
          <div className="result-title">
            {panel.title}
          </div>
          <div className="result-summary">
            {panel.summary}
          </div>

          {panel.details && Object.keys(panel.details).length > 0 && (
            <>
              <div className="result-details-label">Details</div>
              <pre className="result-details">
{JSON.stringify(panel.details, null, 2)}
              </pre>
            </>
          )}

          {panel.raw && (
            <>
              <div className="result-raw-label">Raw Response</div>
              <pre className="result-raw">
{JSON.stringify(panel.raw, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      {vaultToken && (
        <div className="vault-token-section">
          <div className="vault-token-title">Vault token (ssl_token)</div>
          <code className="vault-token-code">{vaultToken}</code>
          <button
            onClick={() => navigator.clipboard.writeText(vaultToken)}
            className="copy-token-button"
          >
            Copy token
          </button>
        </div>
      )}

      <div className="payment-actions">
        <button onClick={handleBack} className="back-button">
          Back to Contract
        </button>
      </div>
    </div>
  );
};

export default ConvergeHPP;
