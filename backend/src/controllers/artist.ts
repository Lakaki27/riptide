import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Artist } from "../entities/Artist";
import { Music } from "../entities/Music";
import { withThumbnailUrl } from "../services/media";

const artistRepository = AppDataSource.getRepository(Artist);
const musicRepository = AppDataSource.getRepository(Music);
const router = Router();

router.get("/", async (req, res) => {
	const page = req.query.page ? Number(req.query.page) : 1;
	const limit = req.query.limit ? Number(req.query.limit) : 50;

	if (page < 1 || limit < 1 || limit > 200) {
		return res.status(400).json({ error: "invalid page or limit" });
	}

	const skip = (page - 1) * limit;

	const [results, total] = await artistRepository
		.createQueryBuilder("artist")
		.orderBy("artist.name", "ASC")
		.skip(skip)
		.take(limit)
		.getManyAndCount();

	res.json({
		results,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	});
});

router.get("/:id", async (req, res) => {
	const { id } = req.params;
	const artist = await artistRepository.findOne({ where: { id } });
	if (!artist) {
		return res.status(404).json({ error: "artist not found" });
	}
	const [rows, total] = await musicRepository
		.createQueryBuilder("music")
		.leftJoinAndSelect("music.artist", "artist")
		.where("artist.id = :id", { id })
		.orderBy("music.title", "ASC")
		.getManyAndCount();
	const musics = await Promise.all(rows.map(withThumbnailUrl));
	res.json({
		id: artist.id,
		name: artist.name,
		createdAt: artist.createdAt,
		musics,
		total,
	});
});

export { router as artistRouter };
