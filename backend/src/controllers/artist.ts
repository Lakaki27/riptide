import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Artist } from "../entities/Artist";
import { Music } from "../entities/Music";
import { withThumbnailUrl } from "../services/media";

const artistRepository = AppDataSource.getRepository(Artist);
const musicRepository = AppDataSource.getRepository(Music);

const router = Router();

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
