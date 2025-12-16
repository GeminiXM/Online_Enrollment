import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import RestrictedGuestPurchase from "./RestrictedGuestPurchase.jsx";
import "./styles.css";

const fetchJson = async (url, options) => {
	const res = await fetch(url, options);
	const data = await res.json().catch(() => ({}));
	return { ok: res.ok, data };
};

export default function App() {
  const [mode, setMode] = useState("member"); // "member" | "restricted"
	const [membershipNumber, setMembershipNumber] = useState("");
	const [clubIdOverride, setClubIdOverride] = useState("");
	const [member, setMember] = useState(null);
	const [club, setClub] = useState(null);
	const [ptPackage, setPtPackage] = useState(null);
	const [specials, setSpecials] = useState([]);
	const [specialsMessage, setSpecialsMessage] = useState("");
	const [receiptEmail, setReceiptEmail] = useState("");
	const [emailValid, setEmailValid] = useState(false);
	const [emailChecking, setEmailChecking] = useState(false);
	const [emailMsg, setEmailMsg] = useState("");
	const [contactEmailValid, setContactEmailValid] = useState(false);
	const [contactEmailMsg, setContactEmailMsg] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [receiptOpen, setReceiptOpen] = useState(false);
	const [receipt, setReceipt] = useState(null);
	const [errorModalOpen, setErrorModalOpen] = useState(false);
	const [errorModalMessage, setErrorModalMessage] = useState("");
  const [errorSuggestContact, setErrorSuggestContact] = useState(false);
  const showError = useCallback((message, suggestContact = true) => {
    const CONTACT_PHRASE = "please contact your club to make this purchase.";
    let msg = (message || "An unexpected error occurred.").toString().trim();
    const lower = msg.toLowerCase();
    const containsContact = lower.includes(CONTACT_PHRASE);
    if (containsContact) {
      // Remove the contact phrase (and any preceding 'If this persists,'), we show it separately
      msg = msg.replace(/\s*\.?\s*if this persists,\s*/i, " ");
      msg = msg.replace(new RegExp("\\s*\\.?\\s*" + CONTACT_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
    }
    setErrorModalMessage(msg);
    setErrorSuggestContact(!!suggestContact && !containsContact);
    setErrorModalOpen(true);
  }, []);

	// Payment state
	const isColorado = club?.state === "CO";
	const isNewMexico = club?.state === "NM";
	// Use the member's home club for processor credentials and posting; fallback to shard id
	const paymentClubId = useMemo(() => {
		const homeId = club?.homeClubId && String(club.homeClubId);
		const shardId = club?.id && String(club.id);
		return homeId || shardId || "";
	}, [club]);
	const [paymentError, setPaymentError] = useState("");
	const [paymentSubmitting, setPaymentSubmitting] = useState(false);
	const [fluidPayInfo, setFluidPayInfo] = useState(null);
	const [fluidPayReady, setFluidPayReady] = useState(false);
	const fluidPayTokenizerRef = useRef(null);
	const [convergeReady, setConvergeReady] = useState(false);
	// Force React to remount the tokenizer container to avoid DOM removal races
	const [tokenizerMountKey, setTokenizerMountKey] = useState(0);

	// Contact info (for internal club emails only; not stored in DB)
	const [contactName, setContactName] = useState("");
	const [contactPhone, setContactPhone] = useState("");
	const [contactEmail, setContactEmail] = useState("");
	const [contactGoals, setContactGoals] = useState("");
	const [preferredTrainer, setPreferredTrainer] = useState("");

	// Club names (sourced from Online_Enrollment ClubContext data)
	const CLUB_ID_TO_NAME = useMemo(
		() => ({
			"201": "Highpoint Sports & Wellness",
			"202": "Midtown Sports & Wellness",
			"203": "Downtown Sports & Wellness",
			"204": "Del Norte Sports & Wellness",
			"205": "Riverpoint Sports & Wellness",
			"252": "Colorado Athletic Club - DTC",
			"254": "Colorado Athletic Club - Tabor Center",
			"257": "Colorado Athletic Club - Flatirons",
			"292": "Colorado Athletic Club - Monaco",
		}),
		[]
	);
	const CLUBS = useMemo(
		() => ([
			// Cluster-level choices for DB routing
			{ id: "252", name: "Colorado Athletic Clubs", shortName: "Colorado", state: "CO" }, // Denver DB
			{ id: "201", name: "New Mexico Sports & Wellness", shortName: "New Mexico", state: "NM" }, // NM DB
		]),
		[]
	);
	const homeClubName = useMemo(() => {
		const homeId = (club?.homeClubId && String(club.homeClubId)) || (club?.id && String(club.id)) || "";
		return homeId ? (CLUB_ID_TO_NAME[homeId] || `Club ${homeId}`) : "";
	}, [club, CLUB_ID_TO_NAME]);

	const membershipStatusLabel = (status) => {
		const s = (status || "").toString().trim().toUpperCase();
		if (s === "A") return "Active";
		if (s === "I") return "Inactive - An Active Membership is Required";
		return s || "";
	};
	const isInactive = (member?.status || "").toString().trim().toUpperCase() === "I";

	const handleLookup = async () => {
		setIsLoading(true);
		setError("");
		setSuccess("");
		setPaymentError("");
		setPaymentSubmitting(false);
		setFluidPayInfo(null);
		setFluidPayReady(false);
		fluidPayTokenizerRef.current = null;
		setMember(null);
		setClub(null);
		setPtPackage(null);
		setSpecials([]);
		setSpecialsMessage("");
		setReceiptEmail("");
			setContactName("");
			setContactPhone("");
			setContactEmail("");
			setContactGoals("");
			setPreferredTrainer("");
		try {
			// Frontend guard: numeric only, max 10
			const raw = membershipNumber.trim();
			if (!/^[0-9]+$/.test(raw) || raw.length > 10) {
				throw new Error("Please enter a valid membership number (digits only, up to 10).");
			}
	const params = new URLSearchParams();
	params.set("membershipNumber", membershipNumber.trim());
	if (clubIdOverride.trim()) params.set("clubId", clubIdOverride.trim());
	console.log("Lookup request", Object.fromEntries(params.entries()));
	const { ok, data } = await fetchJson(`/api/online-buy/member?${params.toString()}`);
			if (!ok || !data?.success) throw new Error(data?.message || "Lookup failed");
			console.log("Lookup response", data);
			// Validate essential fields
			const m = data.member || {};
			const essentialOk =
				(m.membershipName || "").toString().trim().length > 0 &&
				(m.membershipNumber || "").toString().trim().length > 0;
			if (!essentialOk) {
				throw new Error("Membership not found");
			}
			setMember(m);
			setClub(data.club);
			if (data?.club?.id) {
				setClubIdOverride(String(data.club.id));
			}
			// Fetch PT package (use home club for pricing when available)
			const packageClubId = (data?.club?.homeClubId || data?.club?.id || "").toString();
			const { ok: ok2, data: data2 } = await fetchJson(
				`/api/online-buy/pt-package?clubId=${packageClubId}`
			);
			if (ok2 && data2?.success) {
				setPtPackage(data2.ptPackage);
			} else {
				// Gracefully show the backend error in the Package section and disable purchase
				setPtPackage({
					description: (data2?.message || "Failed to get PT package"),
					price: null,
					invtr_upccode: "",
				});
			}

			// Fetch Online Specials for display beneath the package card
			const { ok: okS, data: dataS } = await fetchJson(
				`/api/online-buy/specials?clubId=${packageClubId}`
			);
			if (okS && dataS?.success) {
				setSpecials(Array.isArray(dataS.specials) ? dataS.specials : []);
				setSpecialsMessage((dataS.message || "").toString());
			} else {
				setSpecials([]);
				setSpecialsMessage((dataS?.message || "").toString());
			}
		} catch (e) {
			setError(e.message);
			showError(`${e.message}. Please contact your club to make this purchase.`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFluidPayToken = useCallback(
		async (token) => {
			if (!member?.membershipNumber || !ptPackage?.invtr_upccode || !club?.id) {
				setPaymentError("Membership details missing. Please lookup again.");
				setPaymentSubmitting(false);
				return;
			}
			try {
				// Only send the minimal membership + package data needed by the backend
				const memberPayload = {
					membershipNumber: member.membershipNumber,
					membershipName: member.membershipName || "",
					email: receiptEmail || "",
				};
				const ptPackagePayload = {
					description: ptPackage.description,
					price: ptPackage.price,
					invtr_upccode: ptPackage.invtr_upccode,
				};

				const { ok, data } = await fetchJson("/api/online-buy/purchase", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						clubId: paymentClubId,
						member: memberPayload,
						ptPackage: ptPackagePayload,
						payment: { processor: "FLUIDPAY", token },
						contact: {
							name: contactName,
							phone: contactPhone,
							email: contactEmail,
							goals: contactGoals,
							preferredTrainer,
						},
					}),
				});
				if (!ok || !data?.success) throw new Error(data?.message || "Purchase failed");
				setSuccess(`Payment successful via ${data.processor}. Transaction #${data.transactionId}`);
				setReceipt({
					membershipNumber: memberPayload.membershipNumber,
					description: ptPackagePayload.description,
					price: Number(ptPackagePayload.price || 0),
					last4: data?.last4 || "",
					dbTransactionId: data?.dbTransactionId || "",
					date: new Date().toISOString(),
				});
				setReceiptOpen(true);
				setPaymentError("");
			} catch (err) {
				setPaymentError(err.message);
				showError(`${err.message}. Please contact your club to make this purchase.`);
			} finally {
				setPaymentSubmitting(false);
			}
		},
		[paymentClubId, member, ptPackage, receiptEmail]
	);

	const handleConvergeSuccess = useCallback(
		async (response) => {
			if (!member?.membershipNumber || !ptPackage?.invtr_upccode || !club?.id) {
				setPaymentError("Membership details missing. Please lookup again.");
				setPaymentSubmitting(false);
				return;
			}
			try {
				// Only send the minimal membership + package data needed by the backend
				const memberPayload = {
					membershipNumber: member.membershipNumber,
					membershipName: member.membershipName || "",
					email: receiptEmail || "",
				};
				const ptPackagePayload = {
					description: ptPackage.description,
					price: ptPackage.price,
					invtr_upccode: ptPackage.invtr_upccode,
				};

				const transactionId =
					response?.ssl_txn_id ||
					response?.ssl_transaction_id ||
					response?.transaction_id ||
					"";
				if (!transactionId) {
					throw new Error("Missing transaction id from Converge response");
				}

				// Attempt to extract card details from the Converge response for POS posting (match Online_Enrollment behavior)
				const rawBrand = (
					response?.ssl_card_short_description ||
					response?.aal_card_short_description || // some payloads use 'aal_*'
					response?.ssl_card_type ||
					response?.card_type ||
					""
				).toString().trim();
				const last4FromCardNum =
					(/\d{4}$/.exec((response?.ssl_card_number || "").toString()) || [null])[0];
				const last4FromMasked =
					(/\d{4}$/.exec((response?.ssl_card_number_masked || "").toString()) || [null])[0];
				const last4 = (
					response?.ssl_last4 ||
					response?.ssl_last_four_digits ||
					""
				).toString().trim() || last4FromCardNum || last4FromMasked || "";
				const masked = last4 ? `************${last4}` : (response?.ssl_card_number_masked || "").toString().trim();
				const rawExp = (response?.ssl_exp_date || "").toString().trim(); // often MMYY
				let expDateMMYY = "";
				if (/^\d{4}$/.test(rawExp)) {
					expDateMMYY = `${rawExp.slice(0, 2)}/${rawExp.slice(2)}`;
				} else if (/^\d{2}\/\d{2}$/.test(rawExp)) {
					expDateMMYY = rawExp;
				}

				const payload = {
					clubId: paymentClubId,
					member: memberPayload,
					ptPackage: ptPackagePayload,
					payment: {
						processor: "CONVERGE_HPP",
						alreadyProcessed: true,
						transactionId,
						approvalCode: response?.ssl_approval_code || "",
						message: response?.ssl_result_message || "",
						cardBrand: rawBrand,
						cardMasked: masked,
						expDateMMYY,
					},
					contact: {
						name: contactName,
						phone: contactPhone,
						email: contactEmail,
						goals: contactGoals,
						preferredTrainer,
					},
				};
				const { ok, data } = await fetchJson("/api/online-buy/purchase", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!ok || !data?.success) throw new Error(data?.message || "Purchase failed");
				setSuccess(`Payment successful via ${data.processor}. Transaction #${data.transactionId}`);
				setReceipt({
					membershipNumber: memberPayload.membershipNumber,
					description: ptPackagePayload.description,
					price: Number(ptPackagePayload.price || 0),
					last4: data?.last4 || last4 || "",
					dbTransactionId: data?.dbTransactionId || "",
					date: new Date().toISOString(),
				});
				setReceiptOpen(true);
				setPaymentError("");
			} catch (err) {
				setPaymentError(err.message);
				showError(`${err.message}. Please contact your club to make this purchase.`);
			} finally {
				setPaymentSubmitting(false);
			}
		},
		[paymentClubId, member, ptPackage, receiptEmail]
	);

	useEffect(() => {
		if (!isColorado || !paymentClubId) {
			return;
		}

		let cancelled = false;
		(async () => {
			const { ok, data } = await fetchJson(
				`/api/online-buy/fluidpay-info?clubId=${paymentClubId}`
			);
			if (cancelled) return;
			if (ok && data?.success && data.fluidPayInfo) {
				setFluidPayInfo(data.fluidPayInfo);
			} else if (ok === false) {
				const msg = data?.message || "Unable to load FluidPay configuration.";
				setPaymentError(msg);
				showError(`${msg} Please contact your club to make this purchase.`);
			}
		})();

		return () => {
			cancelled = true;
			setFluidPayInfo(null);
			setFluidPayReady(false);
			fluidPayTokenizerRef.current = null;
		};
	}, [paymentClubId, isColorado]);

	useEffect(() => {
		// Only initialize tokenizer when the payment section (and its container) will be rendered
		if (!isColorado || !fluidPayInfo?.publicKey || !ptPackage) {
			return;
		}

		const initTokenizer = () => {
			if (!window.Tokenizer) return;
			try {
				if (fluidPayTokenizerRef.current?.destroy) {
					fluidPayTokenizerRef.current.destroy();
				}
			} catch (_) {}

			try {
				// Ask React to remount the container, then initialize after commit
				setTokenizerMountKey((k) => k + 1);

				const createTokenizer = () => {
					// Ensure container is empty and present before injecting the iframe
					try {
						const el = document.querySelector("#fluidpay-tokenizer");
						if (el) el.innerHTML = "";
					} catch (_) {}
					const tokenizer = new window.Tokenizer({
						apikey: fluidPayInfo.publicKey,
						container: "#fluidpay-tokenizer",
					settings: {
						payment: { types: ["card"] },
						user: { showInline: true, showName: true, prefill: true },
						billing: { show: true, prefill: true },
						// Use CSS-style selectors per FluidPay Tokenizer docs
						styles: {
							body: {
								color: "#ffffff",
								"font-family":
									"Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
								"font-size": "15px"
							},
							input: {
								color: "#ffffff",
								"border-radius": "10px",
								"background-color": "rgba(255,255,255,0.15)",
								border: "1px solid rgba(255,255,255,0.35)"
							},
							label: {
								color: "rgba(255,255,255,0.85)"
							},
							"input::placeholder": {
								color: "rgba(255,255,255,0.6)"
							},
							".payment .cvv input": {
								border: "solid 1px #ffffff",
								"padding-left": "6px"
							},
							".payment .expiration input": {
								color: "#ffffff"
							},
							".error": {
								color: "#ff98a1"
							},
							".success": {
								color: "#7ce5bc"
							}
						}
					},
						submission: (resp) => {
							if (resp.status === "success" && resp.token) {
								handleFluidPayToken(resp.token);
							} else if (resp.status === "error") {
								const msg = resp.msg || "Payment form error.";
								setPaymentError(msg);
								showError(msg, false);
								setPaymentSubmitting(false);
							} else if (resp.status === "validation") {
								const msg = "Please check your payment information and try again.";
								setPaymentError(msg);
								showError(msg, false);
								setPaymentSubmitting(false);
							}
						},
					});
					fluidPayTokenizerRef.current = tokenizer;
					setFluidPayReady(true);
				};

				// Defer creation until after React commits the remounted container
				requestAnimationFrame(() => {
					requestAnimationFrame(createTokenizer);
				});
			} catch (err) {
				const msg = "Unable to initialize FluidPay form. Please refresh and try again.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
				setFluidPayReady(false);
				fluidPayTokenizerRef.current = null;
				setPaymentSubmitting(false);
			}
		};

		let scriptElement = null;
		if (!window.Tokenizer) {
			scriptElement = document.createElement("script");
			scriptElement.id = "fluidpay-tokenizer-script";
			scriptElement.src = "https://app.fluidpay.com/tokenizer/tokenizer.js";
			scriptElement.async = true;
			scriptElement.onload = () => {
				requestAnimationFrame(() => {
					requestAnimationFrame(initTokenizer);
				});
			};
			scriptElement.onerror = () => {
				const msg = "Unable to load FluidPay payment form. Please refresh and try again.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
			};
			document.body.appendChild(scriptElement);
		} else {
			// Defer init one frame to avoid first-paint flicker
			requestAnimationFrame(() => {
				requestAnimationFrame(initTokenizer);
			});
		}

		return () => {
			if (scriptElement && scriptElement.parentNode) {
				scriptElement.parentNode.removeChild(scriptElement);
			}
			if (fluidPayTokenizerRef.current?.destroy) {
				try {
					fluidPayTokenizerRef.current.destroy();
				} catch (_) {}
			}
			fluidPayTokenizerRef.current = null;
			setFluidPayReady(false);
		};
	}, [isColorado, fluidPayInfo, handleFluidPayToken, ptPackage]);

	useEffect(() => {
		if (!isNewMexico) {
			setConvergeReady(false);
			return;
		}

		let scriptRef = document.getElementById("converge-pay-script");
		if (!scriptRef) {
			scriptRef = document.createElement("script");
			scriptRef.id = "converge-pay-script";
			scriptRef.src = "https://api.convergepay.com/hosted-payments/PayWithConverge.js";
			scriptRef.async = true;
			scriptRef.onload = () => setConvergeReady(true);
			scriptRef.onerror = () => {
				const msg = "Unable to load Converge payment window. Please refresh and try again.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
			};
			document.body.appendChild(scriptRef);
		} else {
			setConvergeReady(true);
		}

		return () => {
			setConvergeReady(false);
		};
	}, [isNewMexico]);

	useEffect(() => {
		if (!isNewMexico) return;

		const handler = (event) => {
			if (!event.origin || !event.origin.includes("convergepay.com")) return;
			const data = event.data;
			if (!data || data.converge !== true) return;

			if (data.cancelled) {
				const msg = "Payment cancelled.";
				setPaymentError(msg);
				showError(`${msg} Please contact your club to make this purchase.`);
				setPaymentSubmitting(false);
				return;
			}

			if (data.errored) {
				const msg = data.error || "Payment error.";
				setPaymentError(msg);
				showError(`${msg} Please contact your club to make this purchase.`);
				setPaymentSubmitting(false);
				return;
			}

			const response = data.response?.data || data.response;
			// Some benign messages may not include a response payload; ignore them
			if (!response) return;

			const approved =
				response.ssl_result === "0" ||
				(response.ssl_result_message &&
					response.ssl_result_message.toLowerCase().includes("approved")) ||
				!!response.ssl_approval_code;

			if (approved) {
				handleConvergeSuccess(response);
			} else {
				const msg = response.ssl_result_message || "Payment declined.";
				setPaymentError(msg);
				showError(`${msg} Please contact your club to make this purchase.`);
				setPaymentSubmitting(false);
			}
		};

		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, [isNewMexico, handleConvergeSuccess]);

	const handlePurchase = async () => {
		if (!member || !ptPackage || !club) return;
		setPaymentError("");
		setSuccess("");

		if (isColorado) {
			if (!fluidPayTokenizerRef.current) {
				const msg = "Secure payment form is still loading. Please wait a moment and try again.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
				return;
			}
			setPaymentSubmitting(true);
			try {
				fluidPayTokenizerRef.current.submit();
			} catch (err) {
				setPaymentSubmitting(false);
				const msg = "Unable to launch FluidPay form. Please refresh and try again.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
			}
			return;
		}

		if (isNewMexico) {
			if (!window.PayWithConverge) {
				const msg = "Converge payment window is still loading. Please wait.";
				setPaymentError(msg);
				showError(`${msg} If this persists, please contact your club to make this purchase.`);
				return;
			}
			setPaymentSubmitting(true);
			try {
				const body = {
					amount: Number(ptPackage.price || 0).toFixed(2),
					orderId: `PT-${member.membershipNumber || Date.now()}`,
					clubId: paymentClubId,
					customerId: member.membershipNumber || undefined,
					memberData: {
						firstName: member.firstName || "",
						lastName: member.lastName || "",
						email: member.email || "",
						phone: member.phone || "",
						address: member.address || "",
						city: member.city || "",
						state: member.state || "",
						zipCode: member.zipCode || "",
					},
				};
				const { ok, data } = await fetchJson("/api/online-buy/converge-hpp/session-token", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!ok || !data?.ssl_txn_auth_token) {
					const msg = data?.message || "Failed to start Converge payment session";
					throw new Error(msg);
				}
				window.PayWithConverge.open({
					ssl_txn_auth_token: data.ssl_txn_auth_token,
				});
			} catch (err) {
				setPaymentError(err.message);
				showError(`${err.message}. Please contact your club to make this purchase.`);
				setPaymentSubmitting(false);
			}
			return;
		}

		const msg = "Unsupported club configuration for payment processing.";
		setPaymentError(msg);
		showError(`${msg} Please contact your club to make this purchase.`);
	};

	return (
		<div className="op-app">
			<Header />
			<main className="op-main">
				<div className="op-container">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="mode-toggle">
              <button
                type="button"
                className={mode === "member" ? "btn btn--primary" : "btn"}
                onClick={() => setMode("member")}
                style={{ marginRight: 8 }}
              >
                Member Purchase
              </button>
              <button
                type="button"
                className={mode === "restricted" ? "btn btn--primary" : "btn"}
                onClick={() => setMode("restricted")}
              >
                Special Guest Purchase
              </button>
            </div>
          </div>

          {mode === "member" && (
          <>
					<header className="op-header">
						{club?.state && (
							<div className="op-brand" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
								{club.state === 'NM' && (
									<img src={`${import.meta.env.BASE_URL}nmsw_logo%20resize50_colored.jpg`} alt="New Mexico Sports & Wellness" style={{ height: 111, width: 'auto', maxWidth: '90%', objectFit: 'contain' }} />
								)}
								{club.state === 'CO' && (
									<img src={`${import.meta.env.BASE_URL}CAC_Logo%20resize%2040_colored.jpg`} alt="Colorado Athletic Club" style={{ height: 103, width: 'auto', maxWidth: '90%', objectFit: 'contain' }} />
								)}
							</div>
						)}
						<h1 className="op-title">Purchase Form</h1>
						<p className="op-subtitle">
							Enter your Membership # to start your purchase.
						</p>
					</header>
					<div className="card">
						<div className="form-row">
							<input
								className="input"
								placeholder="Membership #"
								value={membershipNumber}
								style={{ flex: "0 0 360px", minWidth: 180 }}
								onChange={(e) => setMembershipNumber(e.target.value)}
							/>
							<select
								className="input"
								style={{ flex: "0 1 45%" }}
								value={clubIdOverride}
								onChange={(e) => setClubIdOverride(e.target.value)}
							>
								<option value="">Select Club</option>
								{CLUBS.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
							<button
								className="btn btn--primary"
								onClick={handleLookup}
								disabled={isLoading || !membershipNumber.trim()}
							>
								{isLoading ? "Looking up..." : "Lookup"}
							</button>
						</div>
						{error && <div className="alert alert--error">{error}</div>}
					</div>

					{member && club && ptPackage && <div className="divider" />}

					{member && club && ptPackage && (
						<div className="grid">
							<div className="card">
								<div className="section-title">Membership Details</div>
								<div className="kv">
									<div className="kv__row">
										<div className="kv__key">Home Club</div>
										<div className="kv__value">{homeClubName}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Membership #</div>
										<div className="kv__value">{member.membershipNumber}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Name of Membership</div>
										<div className="kv__value">{member.membershipName}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Address</div>
										<div className="kv__value">
									{member.city}, {member.state} {member.zipCode}
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Membership Status</div>
										<div className="kv__value">
											<span className={`status-badge ${isInactive ? "status-badge--inactive" : "status-badge--active"}`}>
												{membershipStatusLabel(member.status)}
											</span>
										</div>
									</div>
								</div>
							</div>
							<div className="card">
								<div className="section-title">Package</div>
								<div className="kv">
									<div className="kv__row">
										<div className="kv__key">Description</div>
										<div className="kv__value">
											<span className={!ptPackage?.invtr_upccode ? "specials-empty" : undefined}>
												{ptPackage.description}
											</span>
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Price</div>
										<div className="kv__value">
											{ptPackage.price !== null && ptPackage.price !== undefined ? (
												<span className="price">${Number(ptPackage.price).toFixed(2)}</span>
											) : (
												<span className="muted">—</span>
											)}
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key"></div>
										<div className="kv__value">
											<div className="price-note">(including applicable taxes)</div>
										</div>
									</div>
								</div>
							</div>

							<div className="card">
								<div className="section-title">Contact Information</div>
								<div className="kv">
									<div className="kv__row">
										<div className="kv__key">Name</div>
										<div className="kv__value">
											<input className="input" placeholder="Full Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Preferred Phone</div>
										<div className="kv__value">
											<input className="input" placeholder="(555) 555-5555" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Email</div>
										<div className="kv__value">
											<div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
												<input
													className="input"
													type="email"
													autoComplete="email"
													spellCheck={false}
													inputMode="email"
													placeholder="name@example.com"
													value={contactEmail}
													onChange={(e) => {
														const val = e.target.value;
														const email = (val || "").trim();
														setContactEmail(email);
														const looksOk = email.includes("@") && email.split("@")[1]?.includes(".");
														if (email && looksOk) {
															setContactEmailValid(true);
															setContactEmailMsg("");
														} else {
															setContactEmailValid(false);
															setContactEmailMsg(email ? "Invalid email format" : "");
														}
													}}
													onBlur={() => {
														const email = (contactEmail || "").trim();
														if (!email) {
															setContactEmailValid(false);
															setContactEmailMsg("");
															return;
														}
														const looksOk = email.includes("@") && email.split("@")[1]?.includes(".");
														if (looksOk) {
															setContactEmailValid(true);
															setContactEmailMsg("");
														} else {
															setContactEmailValid(false);
															setContactEmailMsg("Invalid email format");
														}
													}}
												/>
												{contactEmailValid ? (
													<span className="valid-icon" title="Verified">✓</span>
												) : contactEmailMsg ? (
													<span className="invalid-icon" title={contactEmailMsg}>!</span>
												) : null}
											</div>
											{contactEmailMsg && !contactEmailValid && (
												<div className="muted" style={{ color: "#ff98a1", marginTop: 6 }}>{contactEmailMsg}</div>
											)}
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Looking to achieve</div>
										<div className="kv__value">
											<textarea className="input" rows={3} placeholder="e.g., want to lose weight" value={contactGoals} onChange={(e) => setContactGoals(e.target.value)} />
										</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Preferred Trainer Name</div>
										<div className="kv__value">
											<input className="input" placeholder="Preferred Trainer" value={preferredTrainer} onChange={(e) => setPreferredTrainer(e.target.value)} />
										</div>
									</div>
								</div>
							</div>

							<div className="card">
								<div className="section-title">Receipt Email</div>
								<div className="form-row">
									<div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
										<input
											className="input"
											type="email"
											autoComplete="email"
											spellCheck={false}
											inputMode="email"
											placeholder="Please enter an email for receipt"
											value={receiptEmail}
											onChange={(e) => {
												const val = e.target.value;
												const email = (val || "").trim();
												setReceiptEmail(email);
												// Lenient client validation for autofill/saved entries
												const looksOk = email.includes("@") && email.split("@")[1]?.includes(".");
												if (email && looksOk) {
													setEmailValid(true);
													setEmailMsg("");
												} else {
													setEmailValid(false);
													setEmailMsg(email ? "Invalid email format" : "");
												}
											}}
											onBlur={(e) => {
												const email = (receiptEmail || "").trim();
												if (!email) {
													setEmailValid(false);
													setEmailMsg("");
													return;
												}
												// Lenient client-side check to accommodate autofill/saved entries
												const looksOk = email.includes("@") && email.split("@")[1]?.includes(".");
												if (looksOk) {
													setEmailValid(true);
													setEmailMsg("");
												} else {
													setEmailValid(false);
													setEmailMsg("Invalid email format");
												}
											}}
										/>
										{emailChecking ? (
											<span className="valid-icon" title="Verifying…">…</span>
										) : emailValid ? (
											<span className="valid-icon" title="Verified">✓</span>
										) : emailMsg ? (
											<span className="invalid-icon" title={emailMsg}>!</span>
										) : null}
									</div>
									{emailMsg && !emailValid && (
										<div className="muted" style={{ color: "#ff98a1" }}>{emailMsg}</div>
									)}
								</div>
							</div>

							<div className="card">
								<div className="section-title">Pay Now</div>

								{isColorado && (
									<div className="stack">
										<div className="tokenizer-shell">
											<div id="fluidpay-tokenizer" className="tokenizer-container" key={tokenizerMountKey} />
											{!fluidPayReady && (
												<div className="tokenizer-loading">
													<div className="loading-spinner" />
													<p>Loading secure payment form...</p>
												</div>
											)}
										</div>
									</div>
								)}
								{isNewMexico && null}

								{paymentError && <div className="alert alert--error">{paymentError}</div>}

								<button
									className="btn btn--primary paynow-button"
									onClick={handlePurchase}
									disabled={
										isInactive ||
										!ptPackage?.invtr_upccode ||
										paymentSubmitting ||
										(isColorado && (!fluidPayReady || !fluidPayTokenizerRef.current)) ||
										(isNewMexico && !convergeReady)
									}
								>
									{paymentSubmitting
										? "Processing..."
										: isNewMexico
											? "Open Secure Payment"
											: "Pay Now"}
								</button>
								{import.meta.env.DEV && (
									<button
										className="btn"
										style={{ marginLeft: 10, marginTop: 10 }}
										onClick={() => {
											const demo = {
												membershipNumber:
													member?.membershipNumber || membershipNumber || "000000",
												membershipName: member?.membershipName || "",
												description: ptPackage?.description || "Package",
												price: Number(ptPackage?.price || 149),
												last4: "4242",
												dbTransactionId: "DEMO123456",
												date: new Date().toISOString(),
											};
											console.log("Preview Receipt demo", demo);
											setReceipt(demo);
											setReceiptOpen(true);
											// Fire-and-forget a preview email to Mark
											fetch("/api/online-buy/send-receipt-preview", {
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													toEmail: "mmoore@wellbridge.com",
													receipt: demo,
													member: { membershipNumber: demo.membershipNumber, membershipName: demo.membershipName },
													club: { id: club?.id, name: homeClubName, state: club?.state },
												}),
											}).catch(() => {});
											// Fire-and-forget internal notification preview to Mark
											fetch("/api/online-buy/send-internal-pt-preview", {
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													toEmail: "mmoore@wellbridge.com",
													member: { membershipNumber: demo.membershipNumber, membershipName: demo.membershipName },
													ptPackage: { description: demo.description, price: demo.price },
													club: { id: club?.id, name: homeClubName, state: club?.state },
													receiptEmail,
													contact: {
														name: contactName,
														phone: contactPhone,
														email: contactEmail || receiptEmail,
														goals: contactGoals,
														preferredTrainer,
													},
												}),
											}).catch(() => {});
										}}
									>
										Preview Receipt
									</button>
								)}
								<div className="secure-note">Payments are processed securely via hosted payment forms. Your card details are tokenized and never stored on our servers.</div>
								{success && <div className="alert alert--success">{success}</div>}
							</div>
						</div>
					)}
          </>
          )}
          {mode === "restricted" && <RestrictedGuestPurchase />}
				</div>
			</main>

			{receiptOpen && receipt && (
				<div className="modal" style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
					<div className="modal__backdrop" onClick={() => setReceiptOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(3,18,32,0.55)' }} />
					<div className="modal__content" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 92vw)', background: '#ffffff', borderRadius: 14, boxShadow: '0 24px 60px rgba(3,18,32,0.35)', padding: '18px 18px 16px', color: '#0e1b35' }}>
						<div className="modal__header">
							<h3 className="modal__title">Receipt</h3>
						</div>
						<div className="modal__body">
						<div className="kv" style={{ marginTop: 4 }}>
							<div className="kv__row">
								<div className="kv__key">Membership #</div>
								<div className="kv__value">{receipt.membershipNumber}</div>
							</div>
							<div className="kv__row">
								<div className="kv__key">Package</div>
								<div className="kv__value">{receipt.description}</div>
							</div>
							<div className="kv__row">
								<div className="kv__key">Price</div>
								<div className="kv__value">${Number(receipt.price || 0).toFixed(2)}</div>
							</div>
							<div className="kv__row">
								<div className="kv__key">Card</div>
								<div className="kv__value">{receipt.last4 ? `•••• ${receipt.last4}` : "—"}</div>
							</div>
							<div className="kv__row">
								<div className="kv__key">Club Transaction #</div>
								<div className="kv__value">{receipt.dbTransactionId || "—"}</div>
							</div>
							<div className="kv__row">
								<div className="kv__key">Date</div>
								<div className="kv__value">{new Date(receipt.date).toLocaleString()}</div>
							</div>
						</div>
						<p className="receipt-note" style={{ marginTop: 12 }}>
							Congratulations on enhancing your fitness journey! The above item has been added to your membership.
							A Club representative will be reaching out to you, or you can go to the club and make arrangements
							to start using this purchase!
						</p>
						{receiptEmail && receiptEmail.trim().length > 0 && (
							<p className="receipt-note" style={{ marginTop: 8 }}>
								A copy of this receipt will be emailed to <strong>{receiptEmail.trim()}</strong>.
							</p>
						)}
						<div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
							<button
								className="btn btn--primary"
								style={{ background: '#0082b5', color: '#ffffff', border: '1px solid #006a94' }}
								onClick={() => setReceiptOpen(false)}
							>
								Close
							</button>
						</div>
						</div>
					</div>
				</div>
			)}

			{errorModalOpen && (
				<div className="modal" style={{ position: 'fixed', inset: 0, zIndex: 10001 }}>
					<div className="modal__backdrop" onClick={() => setErrorModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(3,18,32,0.55)' }} />
					<div className="modal__content" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(520px, 92vw)', background: '#ffffff', borderRadius: 14, boxShadow: '0 24px 60px rgba(3,18,32,0.35)', padding: '18px 18px 16px', color: '#0e1b35' }}>
						<div className="modal__header modal__header--error">
							<h3 className="modal__title">There was a problem</h3>
						</div>
						<div className="modal__body">
							<p className="receipt-note" style={{ marginTop: 4 }}>{errorModalMessage}</p>
							{errorSuggestContact && (
								<p className="receipt-note" style={{ marginTop: 10 }}>
									Please contact your club to make this purchase.
								</p>
							)}
							<div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
								<button
									className="btn"
									onClick={() => setErrorModalOpen(false)}
									style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="op-version-row">
			<div className="op-version-badge">v1.0.2</div>
			</div>
			<Footer />
		</div>
	);
}


