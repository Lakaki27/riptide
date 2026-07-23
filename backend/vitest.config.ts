import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [swc.vite()],
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		reporters: ["default", "junit", "json"],
		outputFile: {
			junit: "./test-results/junit.xml",
			json: "./test-results/results.json",
		},
	},
});
