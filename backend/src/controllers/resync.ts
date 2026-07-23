import { Router } from "express";
import { getJobStatus } from "../services/job";
import { startResyncJob } from "../services/resync";

const router = Router();

router.post("/", (req, res) => {
	const regenerateThumbnails = req.body?.regenerateThumbnails === true;

	const jobId = startResyncJob(regenerateThumbnails);

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

export { router as resyncRouter };
