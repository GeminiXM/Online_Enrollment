import React, { useMemo, useState } from "react";
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
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Payment state
	const isColorado = club?.state === "CO";
	const isNewMexico = club?.state === "NM";
	const [useCardOnFile, setUseCardOnFile] = useState(false);
	const [fluidpayToken, setFluidpayToken] = useState("");
	const [cardNumber, setCardNumber] = useState("");
	const [expMMYY, setExpMMYY] = useState("");
	const [cvv, setCvv] = useState("");

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
		setMember(null);
		setClub(null);
		setPtPackage(null);
		try {
			const params = new URLSearchParams();
			params.set("membershipNumber", membershipNumber.trim());
			if (clubIdOverride.trim()) params.set("clubId", clubIdOverride.trim());
			const { ok, data } = await fetchJson(`/api/online-buy/member?${params.toString()}`);
			if (!ok || !data?.success) throw new Error(data?.message || "Lookup failed");
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

	const handlePurchase = async () => {
		if (!member || !ptPackage || !club) return;
		setIsLoading(true);
		setError("");
		setSuccess("");
		try {
			const payment = (() => {
				// Use card on file flow
				if (useCardOnFile) {
					return {
						processor: isColorado ? "FLUIDPAY" : "CONVERGE",
						token: member?.token || "",
					};
				}
				// New payment entry
				return isColorado
					? { processor: "FLUIDPAY", token: fluidpayToken }
					: { processor: "CONVERGE", cardNumber, expDateMMYY: expMMYY, cvv };
			})();

			const { ok, data } = await fetchJson("/api/online-buy/purchase", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clubId: club.id,
					member,
					ptPackage,
					payment,
				}),
			});
			if (!ok || !data?.success) throw new Error(data?.message || "Purchase failed");
			setSuccess(`Payment successful via ${data.processor}. Transaction #${data.transactionId}`);
		} catch (e) {
			setError(e.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="op-app">
			<Header />
			<main className="op-main">
				<div className="op-container">
					<header className="op-header">
						<h1 className="op-title">Purchase Package</h1>
						<p className="op-subtitle">
							Enter your Membership # to purchase the New Intro Personal Training Package.
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
								<div className="section-title">Verify Member</div>
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
											{[member.address1, member.address2].filter(Boolean).join(" ")}{" "}
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
								<div className="section-title">Existing Membership Payment Method</div>
								<div className="kv">
									<div className="kv__row">
										<div className="kv__key">Type</div>
										<div className="kv__value">{member.ccType || ""}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Credit Card Number</div>
										<div className="kv__value">{member.cardNo || ""}</div>
									</div>
									<div className="kv__row">
										<div className="kv__key">Credit Card Expiration</div>
										<div className="kv__value">{member.ccExpDate || ""}</div>
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
								</div>
							</div>

							<div className="card">
								<div className="section-title">Pay Now</div>

								<label className="checkbox">
									<input
										type="checkbox"
										checked={useCardOnFile}
										onChange={(e) => setUseCardOnFile(e.target.checked)}
										disabled={isInactive}
									/>
									<span>Use Card on File</span>
								</label>
								<div className="muted">Will be billed immediately</div>

								{!useCardOnFile && (
									<>
										{isColorado && (
											<div className="stack">
												<div className="muted">
													Colorado detected: FluidPay Hosted Fields.{" "}
													<span className="italic">(placeholder token input)</span>
												</div>
												<input
													className="input"
													placeholder="FluidPay token"
													value={fluidpayToken}
													onChange={(e) => setFluidpayToken(e.target.value)}
													disabled={isInactive}
												/>
											</div>
										)}
										{isNewMexico && (
											<div className="stack">
												<div className="muted">New Mexico detected: Converge card fields.</div>
												<input
													className="input"
													placeholder="Card Number"
													value={cardNumber}
													onChange={(e) => setCardNumber(e.target.value)}
													disabled={isInactive}
												/>
												<div className="form-row">
													<input
														className="input"
														placeholder="Exp (MMYY)"
														value={expMMYY}
														onChange={(e) => setExpMMYY(e.target.value)}
														disabled={isInactive}
													/>
													<input
														className="input"
														placeholder="CVV"
														value={cvv}
														onChange={(e) => setCvv(e.target.value)}
														disabled={isInactive}
													/>
												</div>
											</div>
										)}
									</>
								)}

								<button
									className="btn btn--primary"
									onClick={handlePurchase}
									disabled={
										isLoading ||
										isInactive ||
										(
											!useCardOnFile &&
											(
												(isColorado && !fluidpayToken.trim()) ||
												(isNewMexico && (!cardNumber.trim() || !expMMYY.trim()))
											)
										)
									}
								>
									{isLoading ? "Processing..." : "Pay Now"}
								</button>
								{success && <div className="alert alert--success">{success}</div>}
							</div>
						</div>
					)}
				</div>
			</main>
			<Footer />
		</div>
	);
}


