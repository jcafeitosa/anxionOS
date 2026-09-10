// @ts-check
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
			dedupe: ["react", "react-dom"],
		},
		ssr: {
			noExternal: ["better-auth"],
		},
		server: {
			proxy: {
				"/api": {
					target: "http://localhost:3000",
					changeOrigin: true,
				},
				"/v1": {
					target: "http://localhost:3000",
					changeOrigin: true,
				},
				"/health": {
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
