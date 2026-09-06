import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Music } from "../entities/Music";
import { PlayEvent } from "../entities/PlayEvent";

const musicRepository = AppDataSource.getRepository(Music);
const playEventRepository = AppDataSource.getRepository(PlayEvent);

const router = Router();

router.post("/plays", async (req, res) => {
    const { musicId } = req.body;

    if (!musicId) {
        return res.status(400).json({ error: "musicId is required" });
    }

    const music = await musicRepository.findOne({ where: { id: musicId } });

    if (!music) {
        return res.status(404).json({ error: "music not found" });
    }

    const playEvent = playEventRepository.create({ music });
    await playEventRepository.save(playEvent);

    res.status(201).json({ id: playEvent.id, playedAt: playEvent.playedAt });
});

router.get("/top-songs", async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 100;

    const results = await playEventRepository
        .createQueryBuilder("playEvent")
        .select("music.id", "musicId")
        .addSelect("music.title", "title")
        .addSelect("COUNT(playEvent.id)", "playCount")
        .innerJoin("playEvent.music", "music")
        .groupBy("music.id")
        .addGroupBy("music.title")
        .orderBy("COUNT(playEvent.id)", "DESC")
        .limit(limit)
        .getRawMany();

    res.json({ results });
});

router.get("/top-artists", async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 100;

    const results = await playEventRepository
        .createQueryBuilder("playEvent")
        .select("artist.id", "artistId")
        .addSelect("artist.name", "name")
        .addSelect("COUNT(playEvent.id)", "playCount")
        .innerJoin("playEvent.music", "music")
        .innerJoin("music.artist", "artist")
        .groupBy("artist.id")
        .addGroupBy("artist.name")
        .orderBy("COUNT(playEvent.id)", "DESC")
        .limit(limit)
        .getRawMany();

    res.json({ results });
});

router.get("/summary", async (_req, res) => {
    const totalPlays = await playEventRepository.count();

    const totalListenTimeResult = await playEventRepository
        .createQueryBuilder("playEvent")
        .innerJoin("playEvent.music", "music")
        .select("SUM(music.durationSeconds)", "totalSeconds")
        .getRawOne();

    res.json({
        totalPlays,
        totalListenSeconds: Number(totalListenTimeResult?.totalSeconds ?? 0),
    });
});

router.get("/heatmap", async (req, res) => {
    const startDate =
        typeof req.query.startDate === "string" ? req.query.startDate : null;
    const endDate =
        typeof req.query.endDate === "string" ? req.query.endDate : null;

    if (!startDate || !endDate) {
        return res
            .status(400)
            .json({ error: "startDate and endDate are required" });
    }

    const results = await playEventRepository
        .createQueryBuilder("playEvent")
        .select("TO_CHAR(playEvent.playedAt, 'YYYY-MM-DD')", "date")
        .addSelect("COUNT(playEvent.id)", "count")
        .where("playEvent.playedAt >= :startDate", {
            startDate: `${startDate} 00:00:00`,
        })
        .andWhere("playEvent.playedAt < :endDate", {
            endDate: `${endDate} 23:59:59`,
        })
        .groupBy("TO_CHAR(playEvent.playedAt, 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(playEvent.playedAt, 'YYYY-MM-DD')", "ASC")
        .getRawMany();

    res.json({
        results: results.map((r) => ({ date: r.date, count: Number(r.count) })),
        startDate,
        endDate,
    });
});

router.get("/earliest-play", async (_req, res) => {
    const earliest = await playEventRepository
        .createQueryBuilder("playEvent")
        .select("TO_CHAR(MIN(playEvent.playedAt), 'YYYY-MM-DD')", "date")
        .getRawOne();

    res.json({ date: earliest?.date ?? null });
});

export { router as statsRouter };
