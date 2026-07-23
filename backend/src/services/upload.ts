import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import type { Music } from "../entities/Music";
import { createJob, updateJob } from "./job";
import { persistMusic, uploadFile } from "./media";

interface FfprobeOutput {
	format: {
		duration?: string;
		tags?: {
			title?: string;
			artist?: string;
		};
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

export async function ingestAudioFile(
	sourcePath: string,
	originalName: string,
): Promise<Music> {
	const workDir = path.join(tmpdir(), nanoid(12));
	await mkdir(workDir, { recursive: true });

	try {
		const probe = await runFfprobe(sourcePath);
		const tags = probe.format.tags ?? {};
		const duration = probe.format.duration ? Number(probe.format.duration) : 0;
		const fallbackTitle = path.parse(originalName).name;

		const musicId = nanoid(12);
		const oggPath = path.join(workDir, `${musicId}.ogg`);

		const title = tags.title ?? fallbackTitle;
		const artistName = tags.artist ?? "Unknown Artist";

		const transcoded = await runFfmpeg([
			"-i",
			sourcePath,
			"-vn",
			"-c:a",
			"libvorbis",
			"-q:a",
			"6",
			"-metadata",
			`title=${title}`,
			"-metadata",
			`artist=${artistName}`,
			oggPath,
		]);

		if (!transcoded) {
			throw new Error(`failed to transcode ${originalName}`);
		}

		const musicKey = `musics/${musicId}.ogg`;
		await uploadFile(oggPath, musicKey, "audio/ogg");

		let thumbnailKey = "";
		const thumbPath = path.join(workDir, `${musicId}-thumb.jpg`);
		const hasThumbnail = await runFfmpeg([
			"-i",
			sourcePath,
			"-an",
			"-vcodec",
			"copy",
			thumbPath,
		]);

		if (hasThumbnail) {
			thumbnailKey = `thumbnails/${musicId}.jpg`;
			await uploadFile(thumbPath, thumbnailKey, "image/jpeg");
		}

		return persistMusic({
			musicId,
			title,
			artistName,
			durationSeconds: duration,
			fileKey: musicKey,
			thumbnailKey,
		});
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}

async function processUploadJob(
	jobId: string,
	sourcePath: string,
	originalName: string,
): Promise<void> {
	try {
		updateJob(jobId, { status: "processing" });
		const music = await ingestAudioFile(sourcePath, originalName);
		updateJob(jobId, { status: "done", musicId: music.id });
	} catch (err) {
		updateJob(jobId, {
			status: "failed",
			error: err instanceof Error ? err.message : "unknown error",
		});
	} finally {
		await rm(sourcePath, { force: true });
	}
}

export function startUploadJob(
	sourcePath: string,
	originalName: string,
): string {
	const jobId = nanoid(12);
	createJob(jobId);
	processUploadJob(jobId, sourcePath, originalName);
	return jobId;
}
