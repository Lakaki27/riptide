import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import { createJob, updateJob } from "./job";
import { persistMusic, probeAudioFile, uploadFile } from "./media";

interface YtDlpMetadata {
    title: string;
    duration: number;
    uploader?: string;
    channel?: string;
    artist?: string;
}

function runYtDlp(url: string, outputTemplate: string): Promise<YtDlpMetadata> {
    console.log("[download] starting yt-dlp for", url);
    return new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", [
            "--js-runtimes",
            "node",
            "-4",
            "--no-playlist",
            "-x",
            "--audio-format",
            "vorbis",
            "--audio-quality",
            "3",
            "--write-thumbnail",
            "--embed-metadata",
            "--print-json",
            "-o",
            outputTemplate,
            url,
        ]);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
            console.log("[yt-dlp stderr]", chunk.toString());
        });

        proc.on("error", (err) => {
            console.error("[download] failed to spawn yt-dlp:", err);
            reject(err);
        });

        proc.on("close", (code) => {
            console.log("[download] yt-dlp exited with code", code);
            if (code !== 0) {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
                return;
            }

            try {
                const lastLine = stdout.trim().split("\n").pop();
                resolve(JSON.parse(lastLine ?? "{}"));
            } catch (err) {
                console.error(
                    "[download] failed to parse yt-dlp json:",
                    err,
                    "stdout was:",
                    stdout,
                );
                reject(new Error("failed to parse yt-dlp metadata output"));
            }
        });
    });
}

function convertThumbnailToJpg(
    inputPath: string,
    outputPath: string,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", ["-y", "-i", inputPath, outputPath]);

        let stderr = "";
        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
            }
        });
    });
}

async function processJob(
    jobId: string,
    url: string,
    overrides?: { title?: string; artist?: string },
): Promise<void> {
    const workDir = path.join(tmpdir(), jobId);

    try {
        updateJob(jobId, { status: "processing" });
        await mkdir(workDir, { recursive: true });

        const outputTemplate = path.join(workDir, "%(id)s.%(ext)s");
        const metadata = await runYtDlp(url, outputTemplate);

        const files = await readdir(workDir);
        const oggFile = files.find((f) => f.endsWith(".ogg"));
        const thumbnailFile = files.find(
            (f) => f !== oggFile && /\.(webp|jpg|jpeg|png)$/.test(f),
        );

        if (!oggFile) {
            throw new Error("no ogg output produced");
        }

        updateJob(jobId, { status: "uploading" });

        const title = overrides?.title ?? metadata.title;
        const artistName =
            overrides?.artist ??
            metadata.artist ??
            metadata.uploader ??
            metadata.channel ??
            "Unknown Artist";

        const musicId = nanoid(12);
        const musicKey = `musics/${musicId}.ogg`;

        // re-stamp metadata into the file if overrides were provided
        if (overrides?.title || overrides?.artist) {
            const stampedPath = path.join(workDir, `${musicId}-final.ogg`);
            await new Promise<void>((resolve, reject) => {
                const proc = spawn("ffmpeg", [
                    "-y",
                    "-i",
                    path.join(workDir, oggFile),
                    "-c",
                    "copy",
                    "-metadata",
                    `title=${title}`,
                    "-metadata",
                    `artist=${artistName}`,
                    stampedPath,
                ]);
                proc.on("close", (code) =>
                    code === 0
                        ? resolve()
                        : reject(new Error("ffmpeg re-stamp failed")),
                );
            });
            await uploadFile(stampedPath, musicKey, "audio/ogg");
        } else {
            await uploadFile(
                path.join(workDir, oggFile),
                musicKey,
                "audio/ogg",
            );
        }

        let thumbnailKey = "";
        if (thumbnailFile) {
            const jpgPath = path.join(workDir, `${musicId}-thumb.jpg`);
            await convertThumbnailToJpg(
                path.join(workDir, thumbnailFile),
                jpgPath,
            );
            thumbnailKey = `thumbnails/${musicId}.jpg`;
            await uploadFile(jpgPath, thumbnailKey, "image/jpeg");
        }

        const probeResult = await probeAudioFile(path.join(workDir, oggFile));

        const music = await persistMusic({
            musicId,
            title,
            artistName,
            durationSeconds: metadata.duration ?? 0,
            fileKey: musicKey,
            thumbnailKey,
            codec: probeResult.codec,
            bitrateKbps: probeResult.bitrateKbps,
            sampleRateHz: probeResult.sampleRateHz,
        });

        updateJob(jobId, { status: "done", musicId: music.id });
    } catch (err) {
        updateJob(jobId, {
            status: "failed",
            error: err instanceof Error ? err.message : "unknown error",
        });
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export function startDownloadJob(
    url: string,
    overrides?: { title?: string; artist?: string },
): string {
    const jobId = nanoid(12);
    createJob(jobId);
    processJob(jobId, url, overrides);
    return jobId;
}

export interface DownloadPreview {
    title: string;
    artist: string;
    thumbnailUrl: string | null;
}

export function previewDownload(url: string): Promise<DownloadPreview> {
    return new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", [
            "--js-runtimes",
            "node",
            "-4",
            "--no-playlist",
            "--dump-json",
            "--no-download",
            url,
        ]);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        proc.on("error", (err) => reject(err));

        proc.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp preview failed: ${stderr}`));
                return;
            }
            try {
                const metadata = JSON.parse(
                    stdout.trim().split("\n").pop() ?? "{}",
                );
                resolve({
                    title: metadata.title ?? "Unknown title",
                    artist:
                        metadata.artist ??
                        metadata.uploader ??
                        metadata.channel ??
                        "Unknown Artist",
                    thumbnailUrl: metadata.thumbnail ?? null,
                });
            } catch {
                reject(new Error("failed to parse preview metadata"));
            }
        });
    });
}
