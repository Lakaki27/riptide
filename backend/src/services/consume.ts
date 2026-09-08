import { readdir } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { requireEnv } from "../env";
import { ingestAudioFile } from "./upload";
import { createJob, updateJob } from "./job";

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".flac",
    ".wav",
    ".m4a",
    ".ogg",
    ".wma",
    ".aac",
    ".opus",
]);

async function listAudioFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listAudioFiles(fullPath)));
        } else if (
            AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ) {
            files.push(fullPath);
        }
    }
    return files;
}

async function processConsumeJob(jobId: string): Promise<void> {
    const consumeDir = requireEnv("CONSUME_DIR");
    const files = await listAudioFiles(consumeDir);
    const total = files.length;
    let processed = 0;

    updateJob(jobId, { status: "processing", processed, total });

    for (const filePath of files) {
        try {
            await ingestAudioFile(filePath, path.basename(filePath));
        } catch {
            // continue processing remaining files even if one fails
        }
        processed++;
        updateJob(jobId, { status: "processing", processed, total });
    }

    updateJob(jobId, { status: "done", processed: total, total });
}

export function startConsumeJob(): string {
    const jobId = nanoid(12);
    createJob(jobId);
    processConsumeJob(jobId);
    return jobId;
}
