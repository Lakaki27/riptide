import { defineConfig } from "vitest/config";
import path from "node:path";

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
