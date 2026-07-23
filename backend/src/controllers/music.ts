import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Music } from "../entities/Music";
import { getPresignedUrl, withThumbnailUrl } from "../services/media";

const musicRepository = AppDataSource.getRepository(Music);
const ALLOWED_SORT_FIELDS = new Set(["title", "createdAt", "durationSeconds"]);
const router = Router();

router.get("/", async (req, res) => {
	const page = req.query.page ? Number(req.query.page) : 1;
	const limit = req.query.limit ? Number(req.query.limit) : 50;
	const sortField =
		typeof req.query.sort === "string" &&
		ALLOWED_SORT_FIELDS.has(req.query.sort)
			? req.query.sort
			: "title";
	const sortOrder = req.query.order === "desc" ? "DESC" : "ASC";

	if (page < 1 || limit < 1 || limit > 200) {
		return res.status(400).json({ error: "invalid page or limit" });
	}

	const skip = (page - 1) * limit;

	const [rows, total] = await musicRepository
		.createQueryBuilder("music")
		.leftJoinAndSelect("music.artist", "artist")
		.orderBy(`music.${sortField}`, sortOrder)
		.skip(skip)
		.take(limit)
		.getManyAndCount();

	const results = await Promise.all(rows.map(withThumbnailUrl));

	res.json({
		results,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	});
});

router.get("/shuffle", async (_req, res) => {
	const rows = await musicRepository
		.createQueryBuilder("music")
		.select("music.id")
		.getMany();

	const remaining = rows.map((row) => row.id);
	const shuffled: string[] = [];

	while (remaining.length > 0) {
		const index = Math.floor(Math.random() * remaining.length);
		const [picked] = remaining.splice(index, 1);

		if (picked === undefined) {
			throw new Error("unexpected shuffle error");
		}

		shuffled.push(picked);
	}

	res.json({ ids: shuffled });
});

router.get("/:id/stream-url", async (req, res) => {
	const { id } = req.params;

	const music = await musicRepository.findOne({ where: { id } });

	if (!music) {
		return res.status(404).json({ error: "music not found" });
	}

	const url = await getPresignedUrl(music.fileKey);
	res.json({ url });
});

router.get("/:id", async (req, res) => {
	const { id } = req.params;

	const music = await musicRepository.findOne({
		where: { id },
		relations: ["artist"],
	});

	if (!music) {
		return res.status(404).json({ error: "music not found" });
	}

	res.json(await withThumbnailUrl(music));
});

export { router as musicRouter };
