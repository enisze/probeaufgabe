import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	type S3Client,
} from "@aws-sdk/client-s3";
import { createWriteStream, writeFileSync } from "node:fs";
import { Readable } from "node:stream";

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

interface UploadToS3Params extends S3Params {
	key: string;
	s3Url: string;
}

export async function uploadToS3({
	s3Client,
	bucketName,
	key,
	s3Url,
}: UploadToS3Params): Promise<void> {
	try {
		console.log(`Uploading to s3://${bucketName}/${key}`);

		const body = await uploadFromUrl(s3Url);

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

interface DownloadFromS3Params extends S3Params {
	key: string;
	outputPath: string;
}

export async function downloadFromS3({
	s3Client,
	bucketName,
	key,
	outputPath,
}: DownloadFromS3Params): Promise<void> {
	try {
		console.log(`Downloading s3://${bucketName}/${key} to ${outputPath}`);

		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		const response = await s3Client.send(command);

		if (response.Body instanceof Readable) {
			const writeStream = createWriteStream(outputPath);
			response.Body.pipe(writeStream);

			return new Promise((resolve, reject) => {
				writeStream.on("finish", () => {
					console.log(
						`Successfully downloaded s3://${bucketName}/${key} to ${outputPath}`,
					);
					resolve();
				});
				writeStream.on("error", (err) => {
					console.error("Error writing file:", err);
					reject(err);
				});
			});
		}
		const body = await response.Body?.transformToByteArray();
		if (body) {
			writeFileSync(outputPath, Buffer.from(body));
			console.log(
				`Successfully downloaded s3://${bucketName}/${key} to ${outputPath}`,
			);
		} else {
			throw new Error("Empty response body");
		}
	} catch (error) {
		console.error("Error downloading file from S3:", error);
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
