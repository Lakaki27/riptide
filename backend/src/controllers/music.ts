import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Music } from "../entities/Music";
import { requireAdmin } from "../middleware/auth";
import { deleteFile, getPresignedUrl, withThumbnailUrl } from "../services/media";
import { getParamAndAssertString } from "../utils/getParamAndAssertString";

const musicRepository = AppDataSource.getRepository(Music);
const ALLOWED_SORT_FIELDS = new Set(["title", "createdAt", "durationSeconds"]);
const router = Router();

router.get("/", async (req, res) => {
    const sortField =
        typeof req.query.sort === "string" && ALLOWED_SORT_FIELDS.has(req.query.sort)
            ? req.query.sort
            : "createdAt";

    const sortOrder = req.query.order === "asc" ? "ASC" : "DESC";

    const rows = await musicRepository
        .createQueryBuilder("music")
        .leftJoinAndSelect("music.artist", "artist")
        .orderBy(`music.${sortField}`, sortOrder)
        .getMany();

    const results = await Promise.all(rows.map(withThumbnailUrl));

    return res.json(results);
});

router.get("/shuffle", async (_req, res) => {
    const rows = await musicRepository.createQueryBuilder("music").select("music.id").getMany();

    const remaining = rows.map((row) => row.id);
    const shuffled: string[] = [];

    while (remaining.length > 0) {
        const index = Math.floor(Math.random() * remaining.length);
        const [picked] = remaining.splice(index, 1);

        if (picked === undefined) {
            throw new Error("unexpected shuffle error");
        }

        shuffled.push(picked);
    }

    res.json({ ids: shuffled });
});

router.get("/:id/stream-url", async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");

    if (!id) {
        return res.status(400).json({ error: "invalid music id" });
    }

    const music = await musicRepository.findOne({ where: { id } });

    if (!music) {
        return res.status(404).json({ error: "music not found" });
    }

    const url = await getPresignedUrl(music.fileKey);
    res.json({ url });
});

router.get("/:id", async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");

    if (!id) {
        return res.status(400).json({ error: "invalid music id" });
    }

    const music = await musicRepository.findOne({
        where: { id },
        relations: ["artist"],
    });

    if (!music) {
        return res.status(404).json({ error: "music not found" });
    }

    res.json(await withThumbnailUrl(music));
});

router.delete("/:id", requireAdmin, async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");

    if (!id) {
        return res.status(400).json({ error: "invalid music id" });
    }

    const music = await musicRepository.findOne({ where: { id } });

    if (!music) {
        return res.status(404).json({ error: "music not found" });
    }

    await deleteFile(music.fileKey);

    if (music.thumbnailKey) {
        await deleteFile(music.thumbnailKey);
    }

    await musicRepository.remove(music);

    res.sendStatus(204);
});

export { router as musicRouter };
