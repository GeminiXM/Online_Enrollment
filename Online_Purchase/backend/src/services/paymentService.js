"use strict";

import axios from "axios";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";

// Converge direct sale using credentials from DB (similar to existing logic)
export async function processConvergeSale(clubId, amount, cardTokenOrCardData, customerData) {
	// Fetch Converge credentials
	const result = await pool.query(
		clubId,
		"EXECUTE PROCEDURE procConvergeItemSelect1(?)",
		[clubId]
	);

	let convergeInfo = null;
	if (Array.isArray(result) && result.length > 0) {
		const r = result[0];
		convergeInfo = {
			ssl_account_id: (r.merchant_id || "").trim(),
			ssl_user_id: (r.converge_user_id || "").trim(),
			ssl_pin: (r.converge_pin || "").trim(),
			ssl_url_process:
				(r.converge_url_process || "https://api.convergepay.com/VirtualMerchant/process.do").trim(),
		};
	}
	if (!convergeInfo?.ssl_account_id || !convergeInfo?.ssl_user_id || !convergeInfo?.ssl_pin) {
		throw new Error("Converge credentials not found");
	}

	const paymentData = {
		ssl_merchant_id: convergeInfo.ssl_account_id,
		ssl_user_id: convergeInfo.ssl_user_id,
		ssl_pin: convergeInfo.ssl_pin,
		ssl_transaction_type: "ccsale",
		ssl_amount: Number(amount).toFixed(2),
		ssl_result_format: "JSON",
		ssl_first_name: customerData?.firstName || "",
		ssl_last_name: customerData?.lastName || "",
		ssl_avs_address: customerData?.address || "",
		ssl_city: customerData?.city || "",
		ssl_state: customerData?.state || "",
		ssl_avs_zip: customerData?.zipCode || "",
		ssl_email: customerData?.email || "",
		ssl_phone: customerData?.phone || "",
		ssl_description: "PT3PK Purchase",
	};

	// If token provided
	if (cardTokenOrCardData?.token) {
		paymentData.ssl_token = cardTokenOrCardData.token;
	} else {
		// direct card (only if absolutely necessary)
		paymentData.ssl_card_number = cardTokenOrCardData?.cardNumber || "";
		paymentData.ssl_exp_date = cardTokenOrCardData?.expDateMMYY || ""; // mmyy
		paymentData.ssl_cvv2cvc2 = cardTokenOrCardData?.cvv || "";
	}

	const response = await axios.post(convergeInfo.ssl_url_process, paymentData, {
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		timeout: 30000,
	});
	const data = response.data;
	logger.info("Converge sale response", { data });
	if (data?.ssl_result === "0") {
		return {
			success: true,
			transactionId: data.ssl_txn_id,
			approvalCode: data.ssl_approval_code,
			vaultToken: data.ssl_token || null,
		};
	}
	return { success: false, message: data?.ssl_result_message || "Converge sale failed" };
}

// FluidPay sale using hosted fields token
export async function processFluidPaySale(clubId, amount, token, customerInfo) {
	const result = await pool.query(
		clubId,
		"EXECUTE PROCEDURE procFluidPayItemSelect1(?)",
		[clubId]
	);

	let fluidPayInfo = null;
	if (Array.isArray(result) && result.length > 0) {
		const r = result[0];
		fluidPayInfo = {
			fluidpay_base_url: (r.fluidpay_base_url || "https://api.fluidpay.com").trim(),
			fluidpay_api_key: (r.fluidpay_api_key || "").trim(),
			merchant_id: (r.merchant_id || "").trim(),
		};
	}
	if (!fluidPayInfo?.fluidpay_api_key || !fluidPayInfo?.merchant_id) {
		throw new Error("FluidPay credentials not found");
	}

	const apiUrl = `${fluidPayInfo.fluidpay_base_url}/api/transaction`;

	// FluidPay expects amount as an unsigned integer (cents), not a string.
	// Align with the main Online_Enrollment implementation.
	const amountInCents = Math.round(Number(amount) * 100);

	const payload = {
		type: "sale",
		amount: amountInCents,
		payment_method: {
			token,
		},
		processor_id: fluidPayInfo.merchant_id.trim(),
		billing_address: {
			first_name: customerInfo?.firstName || "",
			last_name: customerInfo?.lastName || "",
			postal_code: customerInfo?.zipCode || "",
			email: customerInfo?.email || "",
			phone: customerInfo?.phone || "",
		},
	};
	const headers = {
		Authorization: fluidPayInfo.fluidpay_api_key,
	};

	try {
		const response = await axios.post(apiUrl, payload, { headers, timeout: 30000 });
		const { data } = response;
		logger.info("FluidPay sale response", { data });

		if (data?.status === "approved" || data?.status === "success") {
			// Try to extract card details for POS tender posting
			const card = data?.data?.response_body?.card || {};
			const cardBrand = card.card_type || card.card_brand || "";
			const maskedCard = card.masked_card || "";
			const expMMYY = card.expiration_date || card.exp_date || "";

			return {
				success: true,
				transactionId: data?.data?.id || data?.id || data?.transaction_id || "",
				approvalCode:
					card.auth_code ||
					data?.authorization_code ||
					data?.auth_code ||
					"",
				vaultToken: data?.customer_id || null,
				cardBrand,
				masked: maskedCard,
				expDateMMYY: expMMYY,
			};
		}

		return {
			success: false,
			message: data?.message || data?.msg || "FluidPay sale failed",
		};
	} catch (error) {
		logger.error("FluidPay sale error", {
			message: error.message,
			status: error?.response?.status,
			data: error?.response?.data,
		});

		let userMessage = "FluidPay sale failed";
		const respData = error?.response?.data;
		if (respData) {
			if (typeof respData === "string") {
				userMessage = respData;
			} else if (respData.message) {
				userMessage = respData.message;
			} else if (respData.error) {
				userMessage = respData.error;
			} else if (respData.msg) {
				userMessage = respData.msg;
			}
		}

		return { success: false, message: userMessage };
	}
}


