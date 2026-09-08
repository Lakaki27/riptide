import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { AppDataSource } from "../src/data-source";
import { registerUser } from "../src/services/auth";
import { User } from "../src/entities/User";

describe("input validation", () => {
    let adminToken: string;
    const email = `validation-${Date.now()}@example.com`;

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        await registerUser(email, "password123", "admin", false);
        const login = await request(app)
            .post("/auth/login")
            .send({ email, password: "password123" });
        adminToken = login.body.accessToken;
    });

    afterAll(async () => {
        await AppDataSource.getRepository(User).delete({ email });
        await AppDataSource.destroy();
    });

    it("rejects login with missing fields", async () => {
        const res = await request(app).post("/auth/login").send({ email: "" });
        expect(res.status).toBe(400);
    });

    it("rejects playlist creation with no name", async () => {
        const res = await request(app)
            .post("/playlists")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it("rejects a download request with an invalid URL", async () => {
        const res = await request(app)
            .post("/downloads")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ url: "not-a-real-url" });
        expect([400, 500]).toContain(res.status);
    });

    it("rejects a download request targeting an internal address (SSRF guard)", async () => {
        const res = await request(app)
            .post("/downloads")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ url: "http://localhost:9000/some-internal-path" });
        expect(res.status).toBe(400);
    });

    it("returns 404 for a non-existent song id", async () => {
        const res = await request(app)
            .get("/musics/does-not-exist")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});
