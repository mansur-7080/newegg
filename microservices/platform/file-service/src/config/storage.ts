import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    uploadPath: string;
    publicPath: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
}

export class StorageManager {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    switch (this.config.type) {
      case 'local':
        await this.initializeLocal();
        break;
      case 's3':
        await this.initializeS3();
        break;
      case 'gcs':
        await this.initializeGCS();
        break;
      case 'azure':
        await this.initializeAzure();
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.config.type}`);
    }
  }

  private async initializeLocal(): Promise<void> {
    if (!this.config.local) {
      throw new Error('Local storage configuration is missing');
    }

    const { uploadPath, publicPath } = this.config.local;

    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      logger.info('Created upload directory', { path: uploadPath });
    }

    // Create public directory if it doesn't exist
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
      logger.info('Created public directory', { path: publicPath });
    }

    // Check write permissions
    try {
      const testFile = path.join(uploadPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      logger.info('Local storage initialized successfully', { uploadPath, publicPath });
    } catch (error) {
      throw new Error(`No write permission to upload directory: ${uploadPath}`);
    }
  }

  private async initializeS3(): Promise<void> {
    if (!this.config.s3) {
      throw new Error('S3 storage configuration is missing');
    }

    try {
      // Dynamically import AWS SDK (only if S3 is used)
      const AWS = await import('aws-sdk');
      
      const s3 = new AWS.S3({
        accessKeyId: this.config.s3.accessKeyId,
        secretAccessKey: this.config.s3.secretAccessKey,
        region: this.config.s3.region,
        endpoint: this.config.s3.endpoint,
      });

      // Test connection by listing bucket
      await s3.headBucket({ Bucket: this.config.s3.bucket }).promise();
      logger.info('S3 storage initialized successfully', { 
        bucket: this.config.s3.bucket,
        region: this.config.s3.region,
      });
    } catch (error) {
      throw new Error(`Failed to initialize S3 storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeGCS(): Promise<void> {
    if (!this.config.gcs) {
      throw new Error('Google Cloud Storage configuration is missing');
    }

    try {
      // Dynamically import Google Cloud Storage SDK
      const { Storage } = await import('@google-cloud/storage');
      
      const storage = new Storage({
        projectId: this.config.gcs.projectId,
        keyFilename: this.config.gcs.keyFilename,
      });

      const bucket = storage.bucket(this.config.gcs.bucket);
      const [exists] = await bucket.exists();
      
      if (!exists) {
        throw new Error(`Bucket ${this.config.gcs.bucket} does not exist`);
      }

      logger.info('Google Cloud Storage initialized successfully', { 
        bucket: this.config.gcs.bucket,
        projectId: this.config.gcs.projectId,
      });
    } catch (error) {
      throw new Error(`Failed to initialize Google Cloud Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeAzure(): Promise<void> {
    if (!this.config.azure) {
      throw new Error('Azure storage configuration is missing');
    }

    try {
      // Dynamically import Azure Storage SDK
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${this.config.azure.accountName};AccountKey=${this.config.azure.accountKey};EndpointSuffix=core.windows.net`
      );

      const containerClient = blobServiceClient.getContainerClient(this.config.azure.containerName);
      const exists = await containerClient.exists();
      
      if (!exists) {
        throw new Error(`Container ${this.config.azure.containerName} does not exist`);
      }

      logger.info('Azure Storage initialized successfully', { 
        container: this.config.azure.containerName,
        account: this.config.azure.accountName,
      });
    } catch (error) {
      throw new Error(`Failed to initialize Azure Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConfig(): StorageConfig {
    return this.config;
  }

  getStorageType(): string {
    return this.config.type;
  }
}

export async function connectStorage(): Promise<StorageManager> {
  const storageType = (process.env.STORAGE_TYPE || 'local') as StorageConfig['type'];
  
  let config: StorageConfig;

  switch (storageType) {
    case 'local':
      config = {
        type: 'local',
        local: {
          uploadPath: process.env.STORAGE_PATH || './uploads',
          publicPath: process.env.PUBLIC_PATH || './public',
        },
      };
      break;

    case 's3':
      config = {
        type: 's3',
        s3: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          region: process.env.AWS_REGION!,
          bucket: process.env.AWS_S3_BUCKET!,
          endpoint: process.env.AWS_S3_ENDPOINT,
        },
      };
      break;

    case 'gcs':
      config = {
        type: 'gcs',
        gcs: {
          projectId: process.env.GCS_PROJECT_ID!,
          keyFilename: process.env.GCS_KEY_FILENAME!,
          bucket: process.env.GCS_BUCKET!,
        },
      };
      break;

    case 'azure':
      config = {
        type: 'azure',
        azure: {
          accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME!,
          accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY!,
          containerName: process.env.AZURE_STORAGE_CONTAINER_NAME!,
        },
      };
      break;

    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }

  const storageManager = new StorageManager(config);
  await storageManager.initialize();
  
  return storageManager;
}