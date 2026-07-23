import { createReadStream } from "node:fs";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppDataSource } from "../data-source";
import { Artist } from "../entities/Artist";
import { Music } from "../entities/Music";
import { requireEnv } from "../env";
import { s3Client, s3PublicClient } from "./storage";

const musicRepository = AppDataSource.getRepository(Music);
const artistRepository = AppDataSource.getRepository(Artist);

export async function findOrCreateArtist(name: string): Promise<Artist> {
	const normalizedName = name.trim().replace(/\s+/g, " ") || "Unknown Artist";

	const existing = await artistRepository
		.createQueryBuilder("artist")
		.where("artist.name ILIKE :name", { name: normalizedName })
		.getOne();

	if (existing) {
		return existing;
	}

	const artist = artistRepository.create({ name: normalizedName });
	await artistRepository.save(artist);
	return artist;
}

export async function uploadFile(
	filePath: string,
	key: string,
	contentType: string,
): Promise<void> {
	await s3Client.send(
		new PutObjectCommand({
			Bucket: requireEnv("S3_BUCKET"),
			Key: key,
			Body: createReadStream(filePath),
			ContentType: contentType,
		}),
	);
}

interface PersistMusicInput {
	musicId: string;
	title: string;
	artistName: string;
	durationSeconds: number;
	fileKey: string;
	thumbnailKey: string;
}

export async function persistMusic(input: PersistMusicInput): Promise<Music> {
	const artist = await findOrCreateArtist(input.artistName);

	const music = musicRepository.create({
		id: input.musicId,
		title: input.title,
		artist,
		durationSeconds: Math.round(input.durationSeconds),
		fileKey: input.fileKey,
		thumbnailKey: input.thumbnailKey,
	});

	await musicRepository.save(music);
	return music;
}

export async function getPresignedUrl(
	key: string,
	expiresInSeconds = 900,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: requireEnv("S3_BUCKET"),
		Key: key,
	});

	return getSignedUrl(s3PublicClient, command, { expiresIn: expiresInSeconds });
}

interface MusicWithThumbnail {
	id: string;
	title: string;
	artist: Artist;
	durationSeconds: number;
	createdAt: Date;
	thumbnailUrl: string | null;
}

export async function withThumbnailUrl(
	music: Music,
): Promise<MusicWithThumbnail> {
	const thumbnailUrl = music.thumbnailKey
		? await getPresignedUrl(music.thumbnailKey, 3600)
		: null;

	return {
		id: music.id,
		title: music.title,
		artist: music.artist,
		durationSeconds: music.durationSeconds,
		createdAt: music.createdAt,
		thumbnailUrl,
	};
}
