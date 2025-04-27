import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	type S3Client,
} from "@aws-sdk/client-s3";

interface S3Params {
	s3Client: S3Client;
	bucketName: string;
}

export async function uploadFromUrl(url: string): Promise<Buffer> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

async function getFromS3(
	client: S3Client,
	bucket: string,
	key: string,
): Promise<Buffer> {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	const response = await client.send(command);
	if (!response.Body) {
		throw new Error("Empty response body from S3");
	}

	return Buffer.from(await response.Body.transformToByteArray());
}

interface UploadToS3Params extends S3Params {
	key: string;
	source: {
		sourceClient: S3Client;
		sourceBucket: string;
		sourceKey: string;
	};
}

export async function uploadToS3({
	s3Client,
	bucketName,
	key,
	source,
}: UploadToS3Params): Promise<void> {
	try {
		console.log("Uploading to s3");

		console.log(`Copying from s3://${source.sourceBucket}/${source.sourceKey}`);
		const body = await getFromS3(
			source.sourceClient,
			source.sourceBucket,
			source.sourceKey,
		);

		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: body,
		});

		await s3Client.send(command);
		console.log(`Successfully uploaded to s3://${bucketName}/${key}`);
	} catch (error) {
		console.error("Error uploading to S3:", error);
		throw error;
	}
}

interface DeleteFromS3Params extends S3Params {
	key: string;
}

export async function deleteFromS3({
	s3Client,
	bucketName,
	key,
}: DeleteFromS3Params): Promise<void> {
	try {
		console.log(`Deleting s3://${bucketName}/${key}`);

		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		await s3Client.send(command);
		console.log(`Successfully deleted s3://${bucketName}/${key}`);
	} catch (error) {
		console.error("Error deleting from S3:", error);
		throw error;
	}
}

interface CheckS3ObjectExistsParams extends S3Params {
	key: string;
}

export async function checkS3ObjectExists({
	s3Client,
	bucketName,
	key,
}: CheckS3ObjectExistsParams): Promise<boolean> {
	try {
		const command = new HeadObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		await s3Client.send(command);
		return true;
	} catch (error) {
		if (error instanceof Error && error.name === "NotFound") {
			return false;
		}
		throw error;
	}
}

interface ListS3ObjectsParams extends S3Params {}

export async function listS3Objects({
	s3Client,
	bucketName,
}: ListS3ObjectsParams): Promise<void> {
	try {
		console.log(`Listing objects in s3://${bucketName}`);

		const command = new ListObjectsV2Command({
			Bucket: bucketName,
		});

		const response = await s3Client.send(command);

		if (response.Contents && response.Contents.length > 0) {
			console.log("Objects:");
			for (const item of response.Contents)
				console.log(
					`- ${item.Key} (${item.Size} bytes, Last modified: ${item.LastModified})`,
				);
		} else {
			console.log("No objects found");
		}
	} catch (error) {
		console.error("Error listing objects in S3:", error);
		throw error;
	}
}
