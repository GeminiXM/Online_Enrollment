import React from "react";
import WellbridgeLogo from "../assets/images/wellbridge_white_95c93d.svg";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="op-footer">
			<div className="op-footer__top" />
			<div className="op-footer__content">
				<div className="op-footer__section">
					<div className="op-footer__brand">
						<img src={WellbridgeLogo} alt="Wellbridge" className="op-footer__logo" />
					</div>
					<div className="op-footer__tagline">
						Colorado Athletic Club · Sports &amp; Wellness
					</div>
				</div>
				<div className="op-footer__links">
					<a href="https://wellbridge.com/fit-like-that/" target="_blank" rel="noreferrer">
						Blog
					</a>
					<a href="https://wellbridge.com/club-management/" target="_blank" rel="noreferrer">
						Club Management
					</a>
					<a href="https://wellbridge.com/privacy-policy/" target="_blank" rel="noreferrer">
						Privacy Policy
					</a>
				</div>
			</div>
			<div className="op-footer__bottom">
				© {year} Wellbridge. All Rights Reserved.
			</div>
		</footer>
	);
}


