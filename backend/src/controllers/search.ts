import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Artist } from "../entities/Artist";
import { Music } from "../entities/Music";
import { withThumbnailUrl } from "../services/media";

const musicRepository = AppDataSource.getRepository(Music);
const artistRepository = AppDataSource.getRepository(Artist);
const router = Router();

router.get("/", async (req, res) => {
    const { type } = req.query;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (type !== "music" && type !== "artist") {
        return res
            .status(400)
            .json({ error: "type must be 'music' or 'artist'" });
    }

    if (!q) {
        return res.status(400).json({ error: "q is required" });
    }

    if (type === "artist") {
        const results = await artistRepository
            .createQueryBuilder("artist")
            .where("artist.name ILIKE :q", { q: `%${q}%` })
            .orderBy("artist.name", "ASC")
            .getMany();

        return res.json(results);
    }

    const rows = await musicRepository
        .createQueryBuilder("music")
        .leftJoinAndSelect("music.artist", "artist")
        .where("music.title ILIKE :q", { q: `%${q}%` })
        .orderBy("music.title", "ASC")
        .getMany();

    const results = await Promise.all(rows.map(withThumbnailUrl));

    res.json(results);
});

export { router as searchRouter };
