"use strict";

// Minimal logger to keep output consistent, now with explicit ISO timestamps
function buildPayload(level, message, meta) {
	return {
		timestamp: new Date().toLocaleString(), // server local time only
		level,
		message,
		...(meta ? { meta } : {}),
	};
}

const logger = {
	info: (message, meta) => {
		try {
			console.log(JSON.stringify(buildPayload("info", message, meta)));
		} catch {
			console.log(message, meta || "");
		}
	},
	error: (message, meta) => {
		try {
			console.error(JSON.stringify(buildPayload("error", message, meta)));
		} catch {
			console.error(message, meta || "");
		}
	},
	warn: (message, meta) => {
		try {
			console.warn(JSON.stringify(buildPayload("warn", message, meta)));
		} catch {
			console.warn(message, meta || "");
		}
	},
};

export default logger;


