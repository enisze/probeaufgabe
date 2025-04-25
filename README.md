This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## S3 File Operations Script

This project includes a TypeScript script for interacting with AWS S3 buckets. The script allows you to transfer data between S3 buckets and databases.

### Prerequisites

- AWS credentials configured in your environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Node.js and npm installed

### Installation

Install the required dependencies:

```bash
npm install
```

### Usage

The script now uses predefined constants for configuration instead of command-line arguments. Before running the script, you need to configure the following constants in the script.ts file:

1. `liveDbConnectionString`: Connection string for the Live database
2. `stagingDbConnectionString`: Connection string for the Staging database
3. `liveS3Access`: Configuration for Live S3 storage (region and bucket name)
4. `stagingS3Access`: Configuration for Staging S3 storage (region and bucket name)
5. `tablesToTransfer`: List of tables and columns to transfer in the format "table1.column1, table2.column2"

After configuring these constants, you can run the script with:

```bash
npm run script
```

The script will:
1. Display the configured connection strings and tables to transfer
2. List objects in both Live and Staging S3 buckets
3. Perform additional operations as configured in the main function

### Customizing the Script

You can modify the `main()` function in script.ts to perform specific operations using the helper functions:

- `uploadToS3(bucketName, key, filePath)`: Upload a local file to S3
- `downloadFromS3(bucketName, key, outputPath)`: Download a file from S3 to local storage
- `listS3Objects(bucketName, prefix)`: List objects in an S3 bucket with an optional prefix

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


