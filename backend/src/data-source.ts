import "reflect-metadata";
import { DataSource } from "typeorm";
import { Artist } from "./entities/Artist";
import { Music } from "./entities/Music";
import { PlayEvent } from "./entities/PlayEvent";
import { Playlist } from "./entities/Playlist";
import { RefreshToken } from "./entities/RefreshToken";
import { User } from "./entities/User";
import { requireEnv } from "./env";

export const AppDataSource = new DataSource({
	type: "postgres",
	host: requireEnv("DB_HOST"),
	port: Number(requireEnv("DB_PORT")),
	username: requireEnv("DB_USER"),
	password: requireEnv("DB_PASSWORD"),
	database: requireEnv("DB_NAME"),
	synchronize: true,
	logging: false,
	entities: [Music, Playlist, Artist, User, RefreshToken, PlayEvent],
	migrations: [],
});
