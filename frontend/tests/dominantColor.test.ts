import { describe, expect, it } from "vitest";
import { getDominantColor } from "../src/lib/utils/dominantColor";

describe("getDominantColor", () => {
    it("resolves to null when the image fails to load", async () => {
        const OriginalImage = globalThis.Image;

        class FailingImage {
            onerror: (() => void) | null = null;
            onload: (() => void) | null = null;
            crossOrigin = "";
            set src(_value: string) {
                queueMicrotask(() => this.onerror?.());
            }
        }

        // @ts-expect-error overriding for test purposes
        globalThis.Image = FailingImage;

        const result = await getDominantColor("not-a-real-url");
        expect(result).toBeNull();

        globalThis.Image = OriginalImage;
    });
});
