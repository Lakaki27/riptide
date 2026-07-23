import { tmpdir } from "node:os";
import { Router } from "express";
import multer from "multer";
import { getJobStatus } from "../services/job";
import { startUploadJob } from "../services/upload";

const upload = multer({ dest: tmpdir() });
const router = Router();

router.post("/", upload.array("files"), (req, res) => {
	const files = req.files as Express.Multer.File[] | undefined;

	if (!files || files.length === 0) {
		return res.status(400).json({ error: "at least one file is required" });
	}

	const jobIds = files.map((file) =>
		startUploadJob(file.path, file.originalname),
	);

	res.status(202).json({ jobIds });
});

router.get("/:jobId", (req, res) => {
	const { jobId } = req.params;

	const job = getJobStatus(jobId);

	if (!job) {
		return res.status(404).json({ error: "job not found" });
	}

	res.json(job);
});

export { router as uploadRouter };
