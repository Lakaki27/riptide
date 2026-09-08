import { describe, expect, it, afterEach } from "vitest";
import {
    getMinPasswordLength,
    validatePasswordLength,
} from "../src/services/auth";

describe("password length policy", () => {
    const originalEnv = process.env.PASSWORD_MIN_LENGTH;

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.PASSWORD_MIN_LENGTH;
        } else {
            process.env.PASSWORD_MIN_LENGTH = originalEnv;
        }
    });

    it("returns 0 when unset", () => {
        delete process.env.PASSWORD_MIN_LENGTH;
        expect(getMinPasswordLength()).toBe(0);
    });

    it("returns 0 for a negative value", () => {
        process.env.PASSWORD_MIN_LENGTH = "-5";
        expect(getMinPasswordLength()).toBe(0);
    });

    it("returns 0 for a non-numeric value", () => {
        process.env.PASSWORD_MIN_LENGTH = "abc";
        expect(getMinPasswordLength()).toBe(0);
    });

    it("returns the configured value when valid", () => {
        process.env.PASSWORD_MIN_LENGTH = "8";
        expect(getMinPasswordLength()).toBe(8);
    });

    it("rejects a password shorter than the minimum", () => {
        process.env.PASSWORD_MIN_LENGTH = "8";
        expect(validatePasswordLength("short")).toContain(
            "at least 8 characters",
        );
    });

    it("accepts a password meeting the minimum", () => {
        process.env.PASSWORD_MIN_LENGTH = "8";
        expect(validatePasswordLength("longenough")).toBeNull();
    });

    it("accepts any password when no minimum is set", () => {
        delete process.env.PASSWORD_MIN_LENGTH;
        expect(validatePasswordLength("a")).toBeNull();
    });
});
