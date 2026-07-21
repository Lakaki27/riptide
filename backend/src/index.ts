import express from "express";
import "reflect-metadata";
import { playlistRouter } from "./controllers/playlist.controller";
import { AppDataSource } from "./data-source";
import { requireEnv } from "./env";
import { ensureBucket } from "./storage";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/playlists", playlistRouter);

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
