import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { AppDataSource } from "../src/data-source";
import { User } from "../src/entities/User";
import { adminDeleteUser, registerUser } from "../src/services/auth";

describe("GET /health", () => {
    it("returns status ok", async () => {
        const response = await request(app).get("/health");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });
});

describe("protected account deletion", () => {
    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
    });

    afterAll(async () => {
        await AppDataSource.getRepository(User).delete({
            email: "protected-test@example.com",
        });
        await AppDataSource.getRepository(User).delete({
            email: "requester-test@example.com",
        });
        await AppDataSource.destroy();
    });

    it("refuses to delete a protected account, even by another admin", async () => {
        const protectedUser = await registerUser(
            "protected-test@example.com",
            "password123",
            "admin",
            true,
        );
        const requester = await registerUser(
            "requester-test@example.com",
            "password123",
            "admin",
            false,
        );

        await expect(adminDeleteUser(protectedUser.id, requester.id)).rejects.toThrow(
            "this account cannot be deleted",
        );
    });

    it("refuses self-deletion", async () => {
        const user = await registerUser(
            `self-${Date.now()}@example.com`,
            "password123",
            "user",
            false,
        );
        await expect(adminDeleteUser(user.id, user.id)).rejects.toThrow(
            "you cannot delete your own account",
        );
    });
});
