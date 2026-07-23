import express from "express";
import "reflect-metadata";
import { artistRouter } from "./controllers/artist";
import { authRouter } from "./controllers/auth";
import { configRouter } from "./controllers/config";
import { downloadRouter } from "./controllers/download";
import { musicRouter } from "./controllers/music";
import { playlistRouter } from "./controllers/playlist";
import { resyncRouter } from "./controllers/resync";
import { searchRouter } from "./controllers/search";
import { statsRouter } from "./controllers/stats";
import { uploadRouter } from "./controllers/upload";
import { requireAuth } from "./middleware/auth";

export const app = express();

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
app.use("/artists", requireAuth, artistRouter);
app.use("/search", requireAuth, searchRouter);
app.use("/stats", requireAuth, statsRouter);
app.use("/library/resync", requireAuth, resyncRouter);
