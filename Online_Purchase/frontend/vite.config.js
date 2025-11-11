import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 4071,
		proxy: {
			"/api/online-buy": {
				target: "http://localhost:4070",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "dist",
	},
});

