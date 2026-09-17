import path from "node:path";
import { tmpdir } from "node:os";
import { Router } from "express";
import multer, { MulterError } from "multer";
import { requireAdmin } from "../middleware/auth";
import { getJobStatus } from "../services/job";
import { startUploadJob } from "../services/upload";
import { MAX_FILENAME_LENGTH } from "../utils/validation";

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

const ALLOWED_AUDIO_MIME_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/x-flac",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/opus",
    "audio/x-ms-wma",
    "audio/alac",
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".aac",
    ".ogg",
    ".opus",
    ".wma",
    ".alac",
]);

function isAllowedAudioFile(file: Express.Multer.File): boolean {
    const ext = path.extname(file.originalname).toLowerCase();
    // Trust the extension over the client-supplied MIME type — browsers and
    // OSes are inconsistent about what they report (e.g. for FLAC/Opus) —
    // but still reject anything that matches neither an allowed extension
    // nor an audio/* MIME type, to block disguised non-audio uploads.
    if (ALLOWED_AUDIO_EXTENSIONS.has(ext)) return true;
    return (
        file.mimetype.startsWith("audio/") &&
        ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)
    );
}

const upload = multer({
    dest: tmpdir(),
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 50,
    },
    fileFilter: (_req, file, cb) => {
        // originalname is client-supplied and gets stored/displayed later,
        // so cap it too — nothing stops a crafted request from sending an
        // enormous filename alongside a small file.
        if (file.originalname.length > MAX_FILENAME_LENGTH) {
            cb(new MulterError("LIMIT_FIELD_VALUE", file.fieldname));
            return;
        }
        if (!isAllowedAudioFile(file)) {
            cb(new MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
            return;
        }
        cb(null, true);
    },
});

const router = Router();

router.post("/", requireAdmin, (req, res, next) => {
    upload.array("files")(req, res, (err) => {
        if (err instanceof MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: `file exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB size limit`,
                });
            }
            if (err.code === "LIMIT_UNEXPECTED_FILE") {
                return res
                    .status(400)
                    .json({ error: "only audio files are allowed" });
            }
            if (err.code === "LIMIT_FIELD_VALUE") {
                return res.status(400).json({
                    error: `filename exceeds ${MAX_FILENAME_LENGTH} characters`,
                });
            }
            return res.status(400).json({ error: err.message });
        }
        if (err) {
            return next(err);
        }

        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
            return res
                .status(400)
                .json({ error: "at least one file is required" });
        }

        const jobIds = files.map((file) =>
            startUploadJob(file.path, file.originalname),
        );

        res.status(202).json({ jobIds });
    });
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
