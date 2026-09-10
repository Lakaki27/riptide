import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppDataSource } from "../src/data-source";
import { Artist } from "../src/entities/Artist";
import { findOrCreateArtist } from "../src/services/media";

describe("findOrCreateArtist", () => {
    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
    });

    afterAll(async () => {
        await AppDataSource.getRepository(Artist).delete({ name: "Test Artist" });
        await AppDataSource.destroy();
    });

    it("creates a new artist on first use", async () => {
        const artist = await findOrCreateArtist("Test Artist");
        expect(artist.name).toBe("Test Artist");
    });

    it("matches an existing artist case-insensitively", async () => {
        const artist = await findOrCreateArtist("test artist");
        const all = await AppDataSource.getRepository(Artist)
            .createQueryBuilder("artist")
            .where("artist.name ILIKE :name", { name: "Test Artist" })
            .getMany();
        expect(all).toHaveLength(1);
        expect(artist.name).toBe("Test Artist");
    });

    it("trims and collapses whitespace", async () => {
        const artist = await findOrCreateArtist("  Test   Artist  ");
        expect(artist.name).toBe("Test Artist");
    });
});
