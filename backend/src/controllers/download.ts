import { Router } from "express";
import { previewDownload, startDownloadJob } from "../services/download";
import { getJobStatus } from "../services/job";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/", requireAdmin, (req, res) => {
    const { url, title, artist } = req.body;
    if (!url) {
        return res.status(400).json({ error: "url is required" });
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

export { router as downloadRouter };

router.post("/preview", requireAdmin, async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "url is required" });
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
