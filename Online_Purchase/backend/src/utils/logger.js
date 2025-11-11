"use strict";

// Minimal logger to keep output consistent
const logger = {
	info: (message, meta) => {
		try {
			console.log(
				JSON.stringify(
					{ level: "info", message, ...(meta ? { meta } : {}) },
					null,
					0
				)
			);
		} catch {
			console.log(message, meta || "");
		}
	},
	error: (message, meta) => {
		try {
			console.error(
				JSON.stringify(
					{ level: "error", message, ...(meta ? { meta } : {}) },
					null,
					0
				)
			);
		} catch {
			console.error(message, meta || "");
		}
	},
	warn: (message, meta) => {
		try {
			console.warn(
				JSON.stringify(
					{ level: "warn", message, ...(meta ? { meta } : {}) },
					null,
					0
				)
			);
		} catch {
			console.warn(message, meta || "");
		}
	},
};

export default logger;


