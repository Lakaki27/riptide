import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { AppDataSource } from "../src/data-source";
import { registerUser } from "../src/services/auth";
import { User } from "../src/entities/User";

describe("authentication scenarios", () => {
    const email = `scenario-${Date.now()}@example.com`;
    const password = "correctpassword123";

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        await registerUser(email, password, "user", false);
    });

    afterAll(async () => {
        await AppDataSource.getRepository(User).delete({ email });
        await AppDataSource.destroy();
    });

    it("logs in successfully with valid credentials", async () => {
        const res = await request(app).post("/auth/login").send({ email, password });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });

    it("rejects login with an incorrect password", async () => {
        const res = await request(app).post("/auth/login").send({ email, password: "wrongpassword" });
        expect(res.status).toBe(401);
    });

    it("rejects access to a protected route without a token", async () => {
        const res = await request(app).get("/musics");
        expect(res.status).toBe(401);
    });

    it("rejects a non-admin user from an admin-only route", async () => {
        const login = await request(app).post("/auth/login").send({ email, password });
        const token = login.body.accessToken;

        const res = await request(app)
            .post("/playlists")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Should not be created" });

        expect(res.status).toBe(403);
    });
});