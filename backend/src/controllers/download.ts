import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import {
    isValidDownloadUrl,
    previewDownload,
    startDownloadJob,
} from "../services/download";
import { getJobStatus } from "../services/job";
import {
    MAX_ARTIST_NAME_LENGTH,
    MAX_TITLE_LENGTH,
    MAX_URL_LENGTH,
    tooLongError,
} from "../utils/validation";

const router = Router();

router.post("/", requireAdmin, (req, res) => {
    const { url, title, artist } = req.body;
    if (!url || typeof url !== "string" || !isValidDownloadUrl(url)) {
        return res.status(400).json({ error: "a valid url is required" });
    }

    const urlTooLong = tooLongError(url, MAX_URL_LENGTH, "url");
    if (urlTooLong) {
        return res.status(400).json({ error: urlTooLong });
    }

    const titleTooLong = tooLongError(title, MAX_TITLE_LENGTH, "title");
    if (titleTooLong) {
        return res.status(400).json({ error: titleTooLong });
    }

    const artistTooLong = tooLongError(
        artist,
        MAX_ARTIST_NAME_LENGTH,
        "artist",
    );
    if (artistTooLong) {
        return res.status(400).json({ error: artistTooLong });
    }

    const jobId = startDownloadJob(url, { title, artist });
    res.status(202).json({ jobId });
});

router.get("/:jobId", (req, res) => {
    const { jobId } = req.params;

    const job = getJobStatus(jobId);

    if (!job) {
        return res.status(404).json({ error: "job not found" });
    }

    res.set("Cache-Control", "no-store");
    res.json(job);
});

router.post("/preview", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !isValidDownloadUrl(url)) {
        return res.status(400).json({ error: "a valid url is required" });
    }

    const urlTooLong = tooLongError(url, MAX_URL_LENGTH, "url");
    if (urlTooLong) {
        return res.status(400).json({ error: urlTooLong });
    }

    try {
        const preview = await previewDownload(url);
        res.json(preview);
    } catch (err) {
        res.status(500).json({
            error: err instanceof Error ? err.message : "preview failed",
        });
    }
});

export { router as downloadRouter };
