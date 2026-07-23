import express from "express";
import "reflect-metadata";
import { authRouter } from "./controllers/auth";
import { configRouter } from "./controllers/config";
import { downloadRouter } from "./controllers/download";
import { musicRouter } from "./controllers/music";
import { playlistRouter } from "./controllers/playlist";
import { resyncRouter } from "./controllers/resync";
import { searchRouter } from "./controllers/search";
import { statsRouter } from "./controllers/stats";
import { uploadRouter } from "./controllers/upload";
import { AppDataSource } from "./data-source";
import { requireEnv } from "./env";
import { requireAuth } from "./middleware/auth";
import { ensureBucket } from "./storage";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/config", configRouter);
app.use("/auth", authRouter);
app.use("/playlists", requireAuth, playlistRouter);
app.use("/downloads", requireAuth, downloadRouter);
app.use("/uploads", requireAuth, uploadRouter);
app.use("/musics", requireAuth, musicRouter);
app.use("/search", requireAuth, searchRouter);
app.use("/library/resync", requireAuth, resyncRouter);
app.use("/stats", requireAuth, statsRouter);

async function bootstrap() {
	await AppDataSource.initialize();
	await ensureBucket(requireEnv("S3_BUCKET"));
	app.listen(port, () => {
		console.log(`backend listening on ${port}`);
	});
}

bootstrap().catch((err) => {
	console.error(err);
	process.exit(1);
});
