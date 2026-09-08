import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { startConsumeJob } from "../services/consume";
import { getJobStatus } from "../services/job";

const router = Router();

router.post("/", requireAdmin, (_req, res) => {
    const jobId = startConsumeJob();
    res.status(202).json({ jobId });
});

router.get("/:jobId", requireAdmin, (req, res) => {
    const job = getJobStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: "job not found" });
    res.json(job);
});

export { router as consumeRouter };
