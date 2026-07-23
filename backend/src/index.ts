import { app } from "./app";
import { AppDataSource } from "./data-source";
import { requireEnv } from "./env";
import { ensureBucket } from "./storage";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

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
