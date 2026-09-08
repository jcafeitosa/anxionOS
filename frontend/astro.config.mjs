// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		server: {
			proxy: {
				"/api": {
					target: "http://localhost:3000",
					changeOrigin: true,
				},
			},
		},
	},
	server: {
		port: 4321,
	},
});
