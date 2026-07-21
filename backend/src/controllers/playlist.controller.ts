import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Playlist } from "../entities/Playlist";

const router = Router();
const playlistRepository = AppDataSource.getRepository(Playlist);

router.post("/", async (req, res) => {
	const { name } = req.body;

	if (!name) {
		return res.status(400).json({ error: "name is required" });
	}

	const playlist = playlistRepository.create({ name });
	await playlistRepository.save(playlist);

	res.status(201).json(playlist);
});

router.get("/", async (_req, res) => {
	const playlists = await playlistRepository.find();
	res.json(playlists);
});

router.get("/:id", async (req, res) => {
	const { id } = req.params;

	const playlist = await playlistRepository.findOne({
		where: { id },
		relations: ["musics"],
	});

	if (!playlist) {
		return res.status(404).json({ error: "playlist not found" });
	}

	res.json(playlist);
});

router.patch("/:id", async (req, res) => {
	const { id } = req.params;
	const { name } = req.body;

	const playlist = await playlistRepository.findOne({ where: { id } });

	if (!playlist) {
		return res.status(404).json({ error: "playlist not found" });
	}

	if (name) {
		playlist.name = name;
	}

	await playlistRepository.save(playlist);

	res.json(playlist);
});

router.delete("/:id", async (req, res) => {
	const { id } = req.params;

	const playlist = await playlistRepository.findOne({ where: { id } });

	if (!playlist) {
		return res.status(404).json({ error: "playlist not found" });
	}

	await playlistRepository.remove(playlist);

	res.status(204).send();
});

export { router as playlistRouter };
