import { checkS3ObjectExists, listS3Objects, uploadToS3 } from "@/s3/storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Prisma, PrismaClient } from "./generated/prisma";

const stagingDbConnectionString = process.env.stagingDbConnectionString;
const liveDbConnectionString = process.env.liveDbConnectionString;

const livePrisma = new PrismaClient({
	// datasources: {
	// 	db: {
	// 		url: liveDbConnectionString,
	// 	},
	// },
});

const stagingPrisma = new PrismaClient({
	datasources: {
		db: {
			url: stagingDbConnectionString,
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
] as const;

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

async function isStagingImage(path: string): Promise<ImageInfo> {
	const stagingUrl = stagingS3Config.endpoint.split("https://")[1];
	const stagingPrefix = `${stagingUrl.at(0) + stagingS3Config.bucketName}.${stagingUrl.at(1)}`;
	if (path.includes(stagingPrefix)) {
		const key = path.split(stagingS3Config.endpoint)[1];
		return {
			isStaging: true,
			key,
			withUrl: true,
		};
	}

	try {
		const exists = await checkS3ObjectExists({
			s3Client: stagingClient,
			bucketName: stagingS3Config.bucketName,
			key: path,
		});

		return {
			isStaging: exists,
			key: path,
			withUrl: false,
		};
	} catch (error) {
		console.error("Error! So it should be live");
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

			//@ts-ignore let's ignore this for now
			const stagingData = await stagingPrisma.$queryRaw<RawQueryResult>(query);

			//Do the liveData first
			for (const data of liveData) {
				if (!data[columnName]) continue;
				const { isStaging, key, withUrl } = await isStagingImage(
					data[columnName],
				);

				if (isStaging && key) {
					await uploadToS3({
						s3Client: liveClient,
						bucketName: liveS3Config.bucketName,
						key,
						s3Url: data[columnName],
					});
					console.log(`Uploaded ${data[columnName]} to live s3`);

					// await deleteFromS3({
					//     s3Client: stagingClient,
					//     bucketName: stagingS3Config.bucketName,
					//     key,
					// });

					//@ts-ignore let's ignore this for now
					// await livePrisma[table.trim()].update({
					//     where: { id: image.id },
					//     data: {
					//         image_path: withUrl ? `${liveS3Config.endpoint}${key}`: key,
					//     },
					// });
				}
			}

			const s3Objects = await listS3Objects({
				bucketName: liveS3Config.bucketName,
				s3Client: liveClient,
			});
			console.log(s3Objects);

			//Do the stagingData
			// for (const data of stagingData) {
			// 	if (!data.image_path) continue;
			// 	const { isStaging, key, withUrl } = await isStagingImage(
			// 		data.image_path,
			// 		stagingS3Config,
			// 	);

			// 	if (!isStaging && key) {
			// 		await uploadToS3({
			// 			s3Client: stagingClient,
			// 			bucketName: stagingS3Config.bucketName,
			// 			key,
			// 			s3Url: data.image_path,
			// 		});
			// 		console.log(
			// 			`Uploaded ${data.image_path} to s3://${stagingS3Config.bucketName}/${key}`,
			// 		);

			// await deleteFromS3({
			//     s3Client: liveClient,
			//     bucketName: liveS3Config.bucketName,
			//     key,
			// });

			//@ts-ignore let's ignore this for now
			// await stagingPrisma[table.trim()].update({
			//     where: { id: image.id },
			//     data: {
			//         image_path: withUrl ? `${liveS3Config.endpoint}${key}`: key,
			//     },
			// });
			// 	}
			// }
		}

		// const kiImages = await livePrisma.bilder_ki_images.findMany({});
		// const audio = await livePrisma.audio_submission.findMany({});
		// console.log(kiImages, audio);
	} catch (error) {
		console.error("Operation failed:", error);
		process.exit(1);
	}
}

main().catch(console.error);
