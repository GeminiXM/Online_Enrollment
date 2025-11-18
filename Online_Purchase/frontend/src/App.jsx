import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import "./styles.css";

const fetchJson = async (url, options) => {
	const res = await fetch(url, options);
	const data = await res.json().catch(() => ({}));
	return { ok: res.ok, data };
};

export default function App() {
	const [membershipNumber, setMembershipNumber] = useState("");
	const [clubIdOverride, setClubIdOverride] = useState("");
	const [member, setMember] = useState(null);
	const [club, setClub] = useState(null);
	const [ptPackage, setPtPackage] = useState(null);
	const [receiptEmail, setReceiptEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [receiptOpen, setReceiptOpen] = useState(false);
	const [receipt, setReceipt] = useState(null);

	// Payment state
	const isColorado = club?.state === "CO";
	const isNewMexico = club?.state === "NM";
	const [paymentError, setPaymentError] = useState("");
	const [paymentSubmitting, setPaymentSubmitting] = useState(false);
	const [fluidPayInfo, setFluidPayInfo] = useState(null);
	const [fluidPayReady, setFluidPayReady] = useState(false);
	const fluidPayTokenizerRef = useRef(null);
	const [convergeReady, setConvergeReady] = useState(false);
	// Force React to remount the tokenizer container to avoid DOM removal races
	const [tokenizerMountKey, setTokenizerMountKey] = useState(0);

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
			{ id: "201", name: "Highpoint Sports & Wellness", shortName: "Highpoint", state: "NM" },
			{ id: "202", name: "Midtown Sports & Wellness", shortName: "Midtown", state: "NM" },
			{ id: "203", name: "Downtown Sports & Wellness", shortName: "Downtown", state: "NM" },
			{ id: "204", name: "Del Norte Sports & Wellness", shortName: "Del Norte", state: "NM" },
			{ id: "205", name: "Riverpoint Sports & Wellness", shortName: "Riverpoint", state: "NM" },
			{ id: "252", name: "Colorado Athletic Club - DTC", shortName: "DTC", state: "CO" },
			{ id: "254", name: "Colorado Athletic Club - Tabor Center", shortName: "Tabor Center", state: "CO" },
			{ id: "257", name: "Colorado Athletic Club - Flatirons", shortName: "Flatirons", state: "CO" },
			{ id: "292", name: "Colorado Athletic Club - Monaco", shortName: "Monaco", state: "CO" },
		]),
		[]
	);
	const homeClubName = club?.id ? (CLUB_ID_TO_NAME[String(club.id)] || `Club ${club.id}`) : "";

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
		setReceiptEmail("");
		try {
	const params = new URLSearchParams();
	params.set("membershipNumber", membershipNumber.trim());
	if (clubIdOverride.trim()) params.set("clubId", clubIdOverride.trim());
	console.log("Lookup request", Object.fromEntries(params.entries()));
	const { ok, data } = await fetchJson(`/api/online-buy/member?${params.toString()}`);
			if (!ok || !data?.success) throw new Error(data?.message || "Lookup failed");
			console.log("Lookup response", data);
			setMember(data.member);
			setClub(data.club);
			if (data?.club?.id) {
				setClubIdOverride(String(data.club.id));
			}
			// Fetch PT package
			const { ok: ok2, data: data2 } = await fetchJson(
				`/api/online-buy/pt-package?clubId=${data.club.id}`
			);
			if (!ok2 || !data2?.success) throw new Error(data2?.message || "Failed to get PT package");
			setPtPackage(data2.ptPackage);
		} catch (e) {
			setError(e.message);
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
						clubId: club.id,
						member: memberPayload,
						ptPackage: ptPackagePayload,
						payment: { processor: "FLUIDPAY", token },
					}),
				});
				if (!ok || !data?.success) throw new Error(data?.message || "Purchase failed");
				setSuccess(`Payment successful via ${data.processor}. Transaction #${data.transactionId}`);
				setReceipt({
					membershipNumber: memberPayload.membershipNumber,
					description: ptPackagePayload.description,
					price: Number(ptPackagePayload.price || 0),
					last4: data?.last4 || "",
					date: new Date().toISOString(),
				});
				setReceiptOpen(true);
				setPaymentError("");
			} catch (err) {
				setPaymentError(err.message);
			} finally {
				setPaymentSubmitting(false);
			}
		},
		[club?.id, member, ptPackage, receiptEmail]
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
				const payload = {
					clubId: club.id,
					member: memberPayload,
					ptPackage: ptPackagePayload,
					payment: {
						processor: "CONVERGE_HPP",
						alreadyProcessed: true,
						transactionId,
						approvalCode: response?.ssl_approval_code || "",
						message: response?.ssl_result_message || "",
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
					last4: data?.last4 || "",
					date: new Date().toISOString(),
				});
				setReceiptOpen(true);
				setPaymentError("");
			} catch (err) {
				setPaymentError(err.message);
			} finally {
				setPaymentSubmitting(false);
			}
		},
		[club?.id, member, ptPackage, receiptEmail]
	);

	useEffect(() => {
		if (!isColorado || !club?.id) {
			return;
		}

		let cancelled = false;
		(async () => {
			const { ok, data } = await fetchJson(
				`/api/online-buy/fluidpay-info?clubId=${club.id}`
			);
			if (cancelled) return;
			if (ok && data?.success && data.fluidPayInfo) {
				setFluidPayInfo(data.fluidPayInfo);
			} else if (ok === false) {
				setPaymentError(data?.message || "Unable to load FluidPay configuration.");
			}
		})();

		return () => {
			cancelled = true;
			setFluidPayInfo(null);
			setFluidPayReady(false);
			fluidPayTokenizerRef.current = null;
		};
	}, [club?.id, isColorado]);

	useEffect(() => {
		if (!isColorado || !fluidPayInfo?.publicKey) {
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
								setPaymentError(resp.msg || "Payment form error.");
								setPaymentSubmitting(false);
							} else if (resp.status === "validation") {
								setPaymentError("Please check your payment information and try again.");
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
				setPaymentError("Unable to initialize FluidPay form. Please refresh and try again.");
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
				setPaymentError("Unable to load FluidPay payment form. Please refresh and try again.");
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
	}, [isColorado, fluidPayInfo, handleFluidPayToken]);

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
			scriptRef.onerror = () =>
				setPaymentError("Unable to load Converge payment window. Please refresh and try again.");
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
				setPaymentError("Payment cancelled.");
				setPaymentSubmitting(false);
				return;
			}

			if (data.errored) {
				setPaymentError(data.error || "Payment error.");
				setPaymentSubmitting(false);
				return;
			}

			const response = data.response?.data || data.response;
			if (!response) {
				setPaymentError("Payment response missing.");
				setPaymentSubmitting(false);
				return;
			}

			const approved =
				response.ssl_result === "0" ||
				(response.ssl_result_message &&
					response.ssl_result_message.toLowerCase().includes("approved")) ||
				!!response.ssl_approval_code;

			if (approved) {
				handleConvergeSuccess(response);
			} else {
				setPaymentError(response.ssl_result_message || "Payment declined.");
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
				setPaymentError("Secure payment form is still loading. Please wait a moment and try again.");
				return;
			}
			setPaymentSubmitting(true);
			try {
				fluidPayTokenizerRef.current.submit();
			} catch (err) {
				setPaymentSubmitting(false);
				setPaymentError("Unable to launch FluidPay form. Please refresh and try again.");
			}
			return;
		}

		if (isNewMexico) {
			if (!window.PayWithConverge) {
				setPaymentError("Converge payment window is still loading. Please wait.");
				return;
			}
			setPaymentSubmitting(true);
			try {
				const body = {
					amount: Number(ptPackage.price || 0).toFixed(2),
					orderId: `PT-${member.membershipNumber || Date.now()}`,
					clubId: club.id,
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
					throw new Error(data?.message || "Failed to start Converge payment session");
				}
				window.PayWithConverge.open({
					ssl_txn_auth_token: data.ssl_txn_auth_token,
				});
			} catch (err) {
				setPaymentError(err.message);
				setPaymentSubmitting(false);
			}
			return;
		}

		setPaymentError("Unsupported club configuration for payment processing.");
	};

	return (
		<div className="op-app">
			<Header />
			<main className="op-main">
				<div className="op-container">
					<header className="op-header">
						{club?.state && (
							<div className="op-brand" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
								{club.state === 'NM' && (
									<img src={`${import.meta.env.BASE_URL}nmsw_logo%20resize50_colored.jpg`} alt="New Mexico Sports & Wellness" style={{ height: 84, width: 'auto', maxWidth: '90%', objectFit: 'contain' }} />
								)}
								{club.state === 'CO' && (
									<img src={`${import.meta.env.BASE_URL}CAC_Logo%20resize%2040_colored.jpg`} alt="Colorado Athletic Club" style={{ height: 78, width: 'auto', maxWidth: '90%', objectFit: 'contain' }} />
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
								onChange={(e) => setMembershipNumber(e.target.value)}
							/>
							<select
								className="input input--sm"
								value={clubIdOverride}
								onChange={(e) => setClubIdOverride(e.target.value)}
							>
								<option value="">Select Club</option>
								{CLUBS.map((c) => (
									<option key={c.id} value={c.id}>
										{c.shortName || c.name} ({c.state})
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
										<div className="kv__value">{ptPackage.description}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Price</div>
										<div className="kv__value">
											<span className="price">${Number(ptPackage.price).toFixed(2)}</span>
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
								<div className="section-title">Receipt Email</div>
								<div className="form-row">
									<input
										className="input"
										placeholder="Please enter an email for receipt"
										value={receiptEmail}
										onChange={(e) => setReceiptEmail(e.target.value)}
									/>
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
												description: ptPackage?.description || "Package",
												price: Number(ptPackage?.price || 149),
												last4: "4242",
												date: new Date().toISOString(),
											};
											console.log("Preview Receipt demo", demo);
											setReceipt(demo);
											setReceiptOpen(true);
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

			<Footer />
		</div>
	);
}


