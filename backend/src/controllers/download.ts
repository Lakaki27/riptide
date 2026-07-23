import { Router } from "express";
import { startDownloadJob } from "../services/download";
import { getJobStatus } from "../services/job";

const router = Router();

router.post("/", (req, res) => {
	const { url } = req.body;

	if (!url) {
		return res.status(400).json({ error: "url is required" });
	}

	const jobId = startDownloadJob(url);

	res.status(202).json({ jobId });
});

router.get("/:jobId", (req, res) => {
	const { jobId } = req.params;

	const job = getJobStatus(jobId);

	if (!job) {
		return res.status(404).json({ error: "job not found" });
	}

	res.json(job);
});

export { router as downloadRouter };
