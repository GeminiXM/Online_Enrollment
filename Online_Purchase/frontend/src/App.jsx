"use strict";

import React, { useState } from "react";

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
	const [fluidpayToken, setFluidpayToken] = useState("");
	const [cardNumber, setCardNumber] = useState("");
	const [expMMYY, setExpMMYY] = useState("");
	const [cvv, setCvv] = useState("");

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
			const payment =
				isColorado
					? { processor: "FLUIDPAY", token: fluidpayToken }
					: { processor: "CONVERGE", cardNumber, expDateMMYY: expMMYY, cvv };

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
		<div style={{ maxWidth: 720, margin: "32px auto", fontFamily: "Inter, Arial, sans-serif" }}>
			<h1 style={{ margin: 0 }}>Purchase PT3PK Online</h1>
			<p style={{ marginTop: 8, color: "#666" }}>
				Enter your Membership # to purchase the New Intro Personal Training Package.
			</p>

			<div style={{ marginTop: 16, padding: 16, border: "1px solid #e2e2e2", borderRadius: 8 }}>
				<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
					<input
						placeholder="Membership #"
						value={membershipNumber}
						onChange={(e) => setMembershipNumber(e.target.value)}
						style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
					/>
					<input
						placeholder="Club ID (optional)"
						value={clubIdOverride}
						onChange={(e) => setClubIdOverride(e.target.value)}
						style={{ width: 160, padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
					/>
					<button onClick={handleLookup} disabled={isLoading || !membershipNumber.trim()}>
						{isLoading ? "Looking up..." : "Lookup"}
					</button>
				</div>
				{error && (
					<div style={{ color: "#b00020", marginTop: 12 }}>
						{error}
					</div>
				)}
			</div>

			{member && club && ptPackage && (
				<div style={{ marginTop: 16, display: "grid", gap: 16 }}>
					<div style={{ padding: 16, border: "1px solid #e2e2e2", borderRadius: 8 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>Verify Member</div>
						<div>{member.firstName} {member.lastName} (#{member.membershipNumber})</div>
						<div>{member.email}</div>
						<div>{member.address} {member.city} {member.state} {member.zipCode}</div>
						<div style={{ marginTop: 8, color: "#555" }}>
							Club: {club.name} (#{club.id}) — State: {club.state}
						</div>
					</div>

					<div style={{ padding: 16, border: "1px solid #e2e2e2", borderRadius: 8 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>Package</div>
						<div>{ptPackage.description}</div>
						<div style={{ marginTop: 4, fontSize: 18 }}>
							<strong>${Number(ptPackage.price).toFixed(2)}</strong>
						</div>
					</div>

					<div style={{ padding: 16, border: "1px solid #e2e2e2", borderRadius: 8 }}>
						<div style={{ fontWeight: 600, marginBottom: 8 }}>Payment</div>
						{isColorado && (
							<div style={{ display: "grid", gap: 8 }}>
								<div style={{ color: "#555" }}>
									Colorado detected: Use FluidPay Hosted Fields.
								</div>
								<input
									placeholder="FluidPay token"
									value={fluidpayToken}
									onChange={(e) => setFluidpayToken(e.target.value)}
									style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
								/>
							</div>
						)}
						{isNewMexico && (
							<div style={{ display: "grid", gap: 8 }}>
								<div style={{ color: "#555" }}>
									New Mexico detected: Use Converge card fields.
								</div>
								<input
									placeholder="Card Number"
									value={cardNumber}
									onChange={(e) => setCardNumber(e.target.value)}
									style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
								/>
								<input
									placeholder="Exp (MMYY)"
									value={expMMYY}
									onChange={(e) => setExpMMYY(e.target.value)}
									style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
								/>
								<input
									placeholder="CVV"
									value={cvv}
									onChange={(e) => setCvv(e.target.value)}
									style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
								/>
							</div>
						)}
						<button
							onClick={handlePurchase}
							disabled={
								isLoading ||
								(isColorado && !fluidpayToken.trim()) ||
								(isNewMexico && (!cardNumber.trim() || !expMMYY.trim()))
							}
							style={{ marginTop: 12 }}
						>
							{isLoading ? "Processing..." : "Pay Now"}
						</button>
						{success && (
							<div style={{ color: "#0a7", marginTop: 12 }}>
								{success}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}


