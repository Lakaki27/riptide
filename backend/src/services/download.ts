import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import { createJob, updateJob } from "./job";
import { persistMusic, uploadFile } from "./media";

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

async function processJob(jobId: string, url: string): Promise<void> {
    const workDir = path.join(tmpdir(), jobId);

    try {
        console.log("[download] job", jobId, "starting, workDir:", workDir);
        updateJob(jobId, { status: "processing" });
        await mkdir(workDir, { recursive: true });

        const outputTemplate = path.join(workDir, "%(id)s.%(ext)s");
        const metadata = await runYtDlp(url, outputTemplate);
        console.log("[download] job", jobId, "got metadata:", metadata.title);

        const files = await readdir(workDir);
        console.log("[download] job", jobId, "files in workDir:", files);

        const oggFile = files.find((f) => f.endsWith(".ogg"));
        const thumbnailFile = files.find(
            (f) => f !== oggFile && /\.(webp|jpg|jpeg|png)$/.test(f),
        );

        if (!oggFile) {
            console.error(
                "[download] job",
                jobId,
                "no ogg file produced, files were:",
                files,
            );
            throw new Error("no ogg output produced");
        }

        updateJob(jobId, { status: "uploading" });
        console.log("[download] job", jobId, "uploading", oggFile);

        const artistName =
            metadata.artist ??
            metadata.uploader ??
            metadata.channel ??
            "Unknown Artist";
        const musicId = nanoid(12);
        const musicKey = `musics/${musicId}.ogg`;
        await uploadFile(path.join(workDir, oggFile), musicKey, "audio/ogg");
        console.log("[download] job", jobId, "uploaded audio to", musicKey);

        let thumbnailKey = "";
        if (thumbnailFile) {
            const jpgPath = path.join(workDir, `${musicId}-thumb.jpg`);
            await convertThumbnailToJpg(
                path.join(workDir, thumbnailFile),
                jpgPath,
            );
            thumbnailKey = `thumbnails/${musicId}.jpg`;
            await uploadFile(jpgPath, thumbnailKey, "image/jpeg");
            console.log(
                "[download] job",
                jobId,
                "uploaded thumbnail to",
                thumbnailKey,
            );
        }

        const music = await persistMusic({
            musicId,
            title: metadata.title,
            artistName,
            durationSeconds: metadata.duration ?? 0,
            fileKey: musicKey,
            thumbnailKey,
        });
        console.log("[download] job", jobId, "persisted music row:", music.id);

        updateJob(jobId, { status: "done", musicId: music.id });
        console.log("[download] job", jobId, "DONE");
    } catch (err) {
        console.error("[download] job", jobId, "FAILED:", err);
        updateJob(jobId, {
            status: "failed",
            error: err instanceof Error ? err.message : "unknown error",
        });
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export function startDownloadJob(url: string): string {
    const jobId = nanoid(12);
    createJob(jobId);
    processJob(jobId, url);
    return jobId;
}
