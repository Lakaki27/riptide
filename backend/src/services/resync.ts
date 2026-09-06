import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { AppDataSource } from "../data-source";
import { Music } from "../entities/Music";
import { requireEnv } from "../env";
import { s3Client } from "../storage";
import { createJob, updateJob } from "./job";
import { findOrCreateArtist, probeAudioFile, uploadFile } from "./media";

const musicRepository = AppDataSource.getRepository(Music);

interface FfprobeOutput {
    format: {
        duration?: string;
        tags?: { title?: string; artist?: string };
    };
}

function runFfprobe(inputPath: string): Promise<FfprobeOutput> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffprobe", [
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            inputPath,
        ]);
        let stdout = "";
        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        proc.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`ffprobe exited with code ${code}`));
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch {
                reject(new Error("failed to parse ffprobe output"));
            }
        });
    });
}

function runFfmpeg(args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn("ffmpeg", ["-y", ...args]);
        proc.on("close", (code) => resolve(code === 0));
    });
}

async function objectExists(bucket: string, key: string): Promise<boolean> {
    try {
        await s3Client.send(
            new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return true;
    } catch {
        return false;
    }
}

async function downloadObjectToFile(
    bucket: string,
    key: string,
    destPath: string,
): Promise<void> {
    const result = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = result.Body as Readable;
    await pipeline(body, createWriteStream(destPath));
}

async function listMusicKeys(bucket: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
        const result = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: "musics/",
                ContinuationToken: continuationToken,
            }),
        );
        for (const obj of result.Contents ?? []) {
            if (obj.Key?.endsWith(".ogg")) {
                keys.push(obj.Key);
            }
        }
        continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return keys;
}

async function processResyncJob(
    jobId: string,
    regenerateThumbnails: boolean,
): Promise<void> {
    const bucket = requireEnv("S3_BUCKET");
    const workDir = path.join(tmpdir(), jobId);

    try {
        await mkdir(workDir, { recursive: true });

        const keys = await listMusicKeys(bucket);
        const total = keys.length;
        let processed = 0;
        const seenIds = new Set<string>();

        updateJob(jobId, { status: "processing", processed, total });

        for (const key of keys) {
            const musicId = path.basename(key, ".ogg");
            seenIds.add(musicId);

            const localPath = path.join(workDir, `${musicId}.ogg`);
            await downloadObjectToFile(bucket, key, localPath);

            const probe = await runFfprobe(localPath);
            const tags = probe.format.tags ?? {};
            const duration = probe.format.duration
                ? Number(probe.format.duration)
                : 0;
            const audioInfo = await probeAudioFile(localPath);

            const title = tags.title ?? musicId;
            const artistName = tags.artist ?? "Unknown Artist";
            const artist = await findOrCreateArtist(artistName);

            const thumbnailKey = `thumbnails/${musicId}.jpg`;
            let finalThumbnailKey = "";

            if (regenerateThumbnails) {
                const thumbPath = path.join(workDir, `${musicId}-thumb.jpg`);
                const extracted = await runFfmpeg([
                    "-i",
                    localPath,
                    "-an",
                    "-vcodec",
                    "copy",
                    thumbPath,
                ]);
                if (extracted) {
                    await uploadFile(thumbPath, thumbnailKey, "image/jpeg");
                    finalThumbnailKey = thumbnailKey;
                }
            } else {
                const existing = await objectExists(bucket, thumbnailKey);
                finalThumbnailKey = existing ? thumbnailKey : "";
            }

            const existingRow = await musicRepository.findOne({
                where: { id: musicId },
            });

            if (existingRow) {
                existingRow.title = title;
                existingRow.artist = artist;
                existingRow.durationSeconds = Math.round(duration);
                existingRow.fileKey = key;
                existingRow.codec = audioInfo.codec ?? undefined;
                existingRow.bitrateKbps = audioInfo.bitrateKbps ?? undefined;
                existingRow.sampleRateHz = audioInfo.sampleRateHz ?? undefined;
                if (regenerateThumbnails || finalThumbnailKey) {
                    existingRow.thumbnailKey =
                        finalThumbnailKey || existingRow.thumbnailKey;
                }
                await musicRepository.save(existingRow);
            } else {
                const music = musicRepository.create({
                    id: musicId,
                    title,
                    artist,
                    durationSeconds: Math.round(duration),
                    fileKey: key,
                    thumbnailKey: finalThumbnailKey,
                    codec: audioInfo.codec ?? undefined,
                    bitrateKbps: audioInfo.bitrateKbps ?? undefined,
                    sampleRateHz: audioInfo.sampleRateHz ?? undefined,
                });
                await musicRepository.save(music);
            }

            await rm(localPath, { force: true });
            processed++;
            updateJob(jobId, { status: "processing", processed, total });
        }

        const allRows = await musicRepository.find();
        const staleRows = allRows.filter((row) => !seenIds.has(row.id));
        if (staleRows.length > 0) {
            await musicRepository.remove(staleRows);
        }

        updateJob(jobId, { status: "done", processed: total, total });
    } catch (err) {
        updateJob(jobId, {
            status: "failed",
            error: err instanceof Error ? err.message : "unknown error",
        });
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export function startResyncJob(regenerateThumbnails: boolean): string {
    const jobId = nanoid(12);
    createJob(jobId);
    processResyncJob(jobId, regenerateThumbnails);
    return jobId;
}
