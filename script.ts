import { checkS3ObjectExists, uploadToS3 } from "@/s3/storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Prisma, PrismaClient } from "./generated/live/prisma";

const livePrisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.liveDbConnectionString,
		},
	},
});

const stagingPrisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.stagingDbConnectionString,
		},
	},
});

interface S3Config {
	endpoint: string;
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	bucketName: string;
}

const liveS3Config: S3Config = {
	endpoint: process.env.endpointLive!,
	region: process.env.regionLive!,
	credentials: {
		accessKeyId: process.env.accessKeyIdLive!,
		secretAccessKey: process.env.secretAccessKeyLive!,
	},
	bucketName: process.env.bucketNameLive!,
};

const stagingS3Config: S3Config = {
	endpoint: process.env.endpointStaging!,
	region: process.env.regionStaging!,
	credentials: {
		accessKeyId: process.env.accessKeyIdStaging!,
		secretAccessKey: process.env.secretAccessKeyStaging!,
	},
	bucketName: process.env.bucketNameStaging!,
};

const tablesToTransfer = [
	"audio_submission.path",
	"bilder_ki_images.image_path",
	"edubot_task_files.path",
];

const liveClient = new S3Client({
	endpoint: liveS3Config.endpoint,
	region: liveS3Config.region,
	credentials: liveS3Config.credentials,
});

const stagingClient = new S3Client({
	endpoint: stagingS3Config.endpoint,
	region: stagingS3Config.region,
	credentials: stagingS3Config.credentials,
});

interface ImageInfo {
	isStaging: boolean;
	key: string | null;
	withUrl: boolean;
}

async function isStagingImage({
	path,
	s3Config,
	s3Client,
}: {
	path: string;
	s3Config: S3Config;
	s3Client: S3Client;
}): Promise<ImageInfo> {
	const stagingUrl = s3Config.endpoint.replace("https://", "");
	const stagingPrefix = `https://${s3Config.bucketName}.${stagingUrl}`;

	let withUrl = false;

	if (path.includes(stagingPrefix)) {
		console.log("Staging URL detected");
		withUrl = true;
	}

	try {
		const key = withUrl ? path.split(stagingPrefix)[1] : path;

		const exists = await checkS3ObjectExists({
			s3Client,
			bucketName: s3Config.bucketName,
			key,
		});

		return {
			isStaging: exists,
			key: withUrl ? path.split(stagingPrefix)[1] : path,
			withUrl,
		};
	} catch (error) {
		console.error("Error checking URL existence:", error);

		return {
			isStaging: false,
			key: null,
			withUrl: false,
		};
	}
}

async function main() {
	console.log("Starting data transfer process...");

	try {
		for (const table of tablesToTransfer) {
			const tableName = table.split(".")[0];
			const columnName = table.split(".")[1];

			if (!tableName || !columnName) {
				console.error(`Invalid table format: ${table}`);
				continue;
			}

			console.log(`Table name: ${tableName}`);
			console.log(`Column name: ${columnName}`);

			type RawQueryResult = { [key: string]: string }[];
			const query = Prisma.sql`SELECT ${Prisma.raw(columnName)} FROM ${Prisma.raw(tableName)}`;

			const liveData = await livePrisma.$queryRaw<RawQueryResult>(query);

			for (const data of liveData) {
				if (!data[columnName]) continue;
				const { isStaging, key, withUrl } = await isStagingImage({
					path: data[columnName],
					s3Config: stagingS3Config,
					s3Client: stagingClient,
				});

				if (isStaging && key) {
					console.log("Staging data detected:", data[columnName]);

					await uploadToS3({
						s3Client: liveClient,
						bucketName: liveS3Config.bucketName,
						key,
						source: {
							sourceClient: stagingClient,
							sourceBucket: stagingS3Config.bucketName,
							sourceKey: key,
						},
					});

					console.log("File uploaded to live S3:", data[columnName]);

					const prefixUrl = liveS3Config.endpoint.replace("https://", "");
					const livePrefix = `https://${liveS3Config.bucketName}.${prefixUrl}`;

					//Update database to use the updated URL if needed
					if (withUrl) {
						const updateQuery = Prisma.sql`
                        UPDATE ${Prisma.raw(tableName)}
                        SET ${Prisma.raw(columnName)} = ${`${livePrefix}${key}`}
                        WHERE ${Prisma.raw(columnName)} = ${data[columnName]}
                        `;

						await livePrisma.$executeRaw(updateQuery);

						console.log("Database updated with new URL:", data[columnName]);
					}
				}
			}
		}
	} catch (error) {
		console.error("Operation failed:", error);
		process.exit(1);
	}
}

main().catch(console.error);
