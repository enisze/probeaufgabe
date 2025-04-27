# S3 Data Transfer Tool

This tool transfers s3 objcets from the staging to the live environments and adjusts the database records accordingly. It is designed to work with AWS S3 and PostgreSQL databases.

## Prerequisites

- Node.js (v14 or higher)
- pnpm package manager
- AWS S3 access credentials for both staging and live environments
- Database connection strings for both environments

## Environment Variables

Before running the script, you need to set up the following environment variables in a `.env` file:

### Database Configuration
- `stagingDbConnectionString`: Connection string for the staging database
- `liveDbConnectionString`: Connection string for the live database

### Live S3 Configuration
- `endpointLive`: S3 endpoint URL for the live environment
- `regionLive`: AWS region for the live environment
- `accessKeyIdLive`: AWS access key ID for the live environment
- `secretAccessKeyLive`: AWS secret access key for the live environment
- `bucketNameLive`: S3 bucket name for the live environment (default: "d")

### Staging S3 Configuration
- `endpointStaging`: S3 endpoint URL for the staging environment
- `regionStaging`: AWS region for the staging environment
- `accessKeyIdStaging`: AWS access key ID for the staging environment
- `secretAccessKeyStaging`: AWS secret access key for the staging environment
- `bucketNameStaging`: S3 bucket name for the staging environment

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
4. Edit the `.env` file and fill in all required values
5. Run prisma db pull to generate the Prisma client and update the schema:
   ```
   pnpm prisma db pull
   ```
6. Run Install again to trigger the postinstall script, which generates the Prisma client:
   ```
   pnpm install
   ```

## Usage

Run the script using:

```
pnpm script
```

The script will:
1. Connect to both staging and live databases
2. Check for files in the specified tables that need to be transferred
3. Copy files from staging S3 to live S3 when needed
4. Update database records to point to the new file locations

## Tables Processed

You can specify which tables to process by modifying the `tablesToTransfer` array in the script. The default tables are:
- `audio_submission.path`
- `bilder_ki_images.image_path`
- `edubot_task_files.path`

## Troubleshooting

If you encounter any issues:
1. Ensure all environment variables are correctly set
2. Check that your AWS credentials have the necessary permissions
3. Verify that the database connection strings are correct
4. Check network connectivity to both S3 endpoints