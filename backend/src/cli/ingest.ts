import "reflect-metadata";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { AppDataSource } from "../data-source";
import { ingestAudioFile } from "../services/upload";

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
		} else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
			files.push(fullPath);
		}
	}

	return files;
}

async function main() {
	const targetDir = process.argv[2];

	if (!targetDir) {
		console.error("usage: npm run ingest -- <folder>");
		process.exit(1);
	}

	await AppDataSource.initialize();

	const files = await listAudioFiles(targetDir);
	console.log(`found ${files.length} audio file(s) in ${targetDir}`);

	let succeeded = 0;
	let failed = 0;

	for (const filePath of files) {
		const originalName = path.basename(filePath);
		process.stdout.write(
			`[${succeeded + failed + 1}/${files.length}] ${originalName} ... `,
		);

		try {
			const music = await ingestAudioFile(filePath, originalName);
			console.log(`ok -> ${music.id}`);
			succeeded++;
		} catch (err) {
			console.log(
				`failed: ${err instanceof Error ? err.message : "unknown error"}`,
			);
			failed++;
		}
	}

	console.log(`\ndone. ${succeeded} succeeded, ${failed} failed.`);
	await AppDataSource.destroy();
	process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
