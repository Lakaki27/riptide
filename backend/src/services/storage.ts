import {
	CreateBucketCommand,
	HeadBucketCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { requireEnv } from "../env";

export const s3Client = new S3Client({
	endpoint: requireEnv("S3_ENDPOINT"),
	region: requireEnv("S3_REGION"),
	forcePathStyle: true,
	credentials: {
		accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
		secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
	},
});

export const s3PublicClient = new S3Client({
	endpoint: requireEnv("S3_PUBLIC_ENDPOINT"),
	region: requireEnv("S3_REGION"),
	forcePathStyle: true,
	credentials: {
		accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
		secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
	},
});

export async function ensureBucket(bucket: string): Promise<void> {
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
	} catch {
		await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
	}
}
