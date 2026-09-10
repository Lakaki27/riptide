import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Music } from "../entities/Music";
import { Playlist } from "../entities/Playlist";
import { requireAdmin } from "../middleware/auth";
import { withThumbnailUrl } from "../services/media";
import { getParamAndAssertString } from "../utils/getParamAndAssertString";

const router = Router();
const playlistRepository = AppDataSource.getRepository(Playlist);
const musicRepository = AppDataSource.getRepository(Music);

router.post("/", requireAdmin, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "name is required" });
    }

    const playlist = playlistRepository.create({ name });
    await playlistRepository.save(playlist);

    res.status(201).json(playlist);
});

router.get("/", async (req, res) => {
    const sort = req.query.sort === "createdAt" ? "createdAt" : "name";
    const order = req.query.order === "desc" ? "DESC" : "ASC";

    const playlists = await playlistRepository
        .createQueryBuilder("playlist")
        .orderBy(`playlist.${sort}`, order)
        .getMany();

    res.json(playlists);
});

router.get("/:id", async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");

    if (!id) {
        return res.status(400).json({ error: "invalid playlist id" });
    }

    const playlist = await playlistRepository.findOne({
        where: { id },
        relations: ["musics", "musics.artist"],
    });

    if (!playlist) {
        return res.status(404).json({ error: "playlist not found" });
    }

    const musics = await Promise.all(playlist.musics.map(withThumbnailUrl));

    res.json({
        id: playlist.id,
        name: playlist.name,
        createdAt: playlist.createdAt,
        musics,
    });
});

router.patch("/:id", requireAdmin, async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");
    const { name } = req.body;

    if (!id) {
        return res.status(400).json({ error: "invalid playlist id" });
    }

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

router.delete("/:id", requireAdmin, async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");

    if (!id) {
        return res.status(400).json({ error: "invalid playlist id" });
    }

    const playlist = await playlistRepository.findOne({ where: { id } });

    if (!playlist) {
        return res.status(404).json({ error: "playlist not found" });
    }

    await playlistRepository.remove(playlist);

    res.status(204).send();
});

router.post("/:id", requireAdmin, async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");
    const { songId } = req.body;

    if (!id) {
        return res.status(400).json({ error: "invalid playlist id" });
    }

    const playlist = await playlistRepository.findOne({
        where: { id },
        relations: ["musics"],
    });
    if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    const song = await musicRepository.findOne({ where: { id: songId } });

    if (!song) {
        return res.status(404).json({ error: "Song not found" });
    }

    const alreadyIn = playlist.musics.some((m) => m.id === songId);
    if (alreadyIn) {
        return res.status(409).json({ error: "song is already in this playlist" });
    }

    await AppDataSource.createQueryBuilder().relation(Playlist, "musics").of(id).add(songId);
    return res.sendStatus(204);
});

router.delete("/:id/musics/:musicId", requireAdmin, async (req, res) => {
    const id = getParamAndAssertString(req.params, "id");
    const musicId = getParamAndAssertString(req.params, "musicId");

    if (!id || !musicId) {
        return res.status(400).json({ error: "invalid playlist or music id" });
    }

    const playlist = await playlistRepository.findOne({ where: { id } });

    if (!playlist) {
        return res.status(404).json({ error: "playlist not found" });
    }

    await AppDataSource.createQueryBuilder().relation(Playlist, "musics").of(id).remove(musicId);

    res.sendStatus(204);
});

export { router as playlistRouter };
