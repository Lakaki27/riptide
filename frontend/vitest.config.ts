import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
    },
    resolve: {
        alias: {
            $lib: path.resolve(__dirname, "./src/lib"),
        },
    },
});
