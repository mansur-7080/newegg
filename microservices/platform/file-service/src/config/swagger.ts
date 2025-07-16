import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UltraMarket File Service API',
      version: '1.0.0',
      description: `
        Professional file management service for UltraMarket e-commerce platform.
        Handles file uploads, downloads, image processing, and storage management.
        
        ## Features
        - File upload and download
        - Image processing and optimization
        - Multiple storage backends (Local, AWS S3, Google Cloud, Azure)
        - Virus scanning integration
        - CDN integration
        - Rate limiting and security
        - Chunked upload support
        - Thumbnail generation
        - Metadata extraction
        
        ## Security
        - API key authentication
        - Rate limiting
        - File type validation
        - Virus scanning
        - Security headers
        
        ## Storage Options
        - **Local**: Files stored on local filesystem
        - **AWS S3**: Files stored in Amazon S3 buckets
        - **Google Cloud**: Files stored in Google Cloud Storage
        - **Azure**: Files stored in Azure Blob Storage
      `,
      contact: {
        name: 'UltraMarket Development Team',
        email: 'dev@ultramarket.uz',
        url: 'https://ultramarket.uz',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3005',
        description: 'Development server',
      },
      {
        url: 'https://api.ultramarket.uz/files',
        description: 'Production server',
      },
      {
        url: 'https://staging.ultramarket.uz/files',
        description: 'Staging server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication',
        },
      },
      schemas: {
        FileMetadata: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique file identifier',
              example: 'file_1234567890abcdef',
            },
            filename: {
              type: 'string',
              description: 'Original filename',
              example: 'product-image.jpg',
            },
            mimetype: {
              type: 'string',
              description: 'MIME type of the file',
              example: 'image/jpeg',
            },
            size: {
              type: 'integer',
              description: 'File size in bytes',
              example: 1024000,
            },
            url: {
              type: 'string',
              description: 'Public URL to access the file',
              example: 'https://cdn.ultramarket.uz/files/file_1234567890abcdef.jpg',
            },
            thumbnailUrl: {
              type: 'string',
              description: 'URL to thumbnail version (for images)',
              example: 'https://cdn.ultramarket.uz/files/thumb_file_1234567890abcdef.jpg',
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp',
              example: '2024-01-15T10:30:00Z',
            },
            uploadedBy: {
              type: 'string',
              description: 'User ID who uploaded the file',
              example: 'user_abc123',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'File tags for categorization',
              example: ['product', 'image', 'electronics'],
            },
            metadata: {
              type: 'object',
              description: 'Additional file metadata',
              properties: {
                width: {
                  type: 'integer',
                  description: 'Image width in pixels (for images)',
                },
                height: {
                  type: 'integer',
                  description: 'Image height in pixels (for images)',
                },
                duration: {
                  type: 'number',
                  description: 'Video/audio duration in seconds',
                },
                bitrate: {
                  type: 'integer',
                  description: 'Audio/video bitrate',
                },
              },
            },
          },
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'File uploaded successfully',
            },
            file: {
              $ref: '#/components/schemas/FileMetadata',
            },
            uploadId: {
              type: 'string',
              description: 'Upload session ID (for chunked uploads)',
              example: 'upload_1234567890abcdef',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'File Upload Error',
            },
            message: {
              type: 'string',
              example: 'File size exceeds maximum allowed size',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            details: {
              type: 'object',
              description: 'Additional error details (in development mode)',
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'ready', 'not ready', 'alive'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            service: {
              type: 'string',
              example: 'file-service',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            uptime: {
              type: 'number',
              description: 'Service uptime in seconds',
              example: 3600,
            },
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'number',
                  description: 'Used memory in MB',
                },
                total: {
                  type: 'number',
                  description: 'Total memory in MB',
                },
                external: {
                  type: 'number',
                  description: 'External memory in MB',
                },
                unit: {
                  type: 'string',
                  example: 'MB',
                },
              },
            },
            storage: {
              type: 'object',
              properties: {
                available: {
                  type: 'boolean',
                  example: true,
                },
                type: {
                  type: 'string',
                  example: 'local',
                },
                status: {
                  type: 'string',
                  example: 'connected',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
      {
        BearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Files',
        description: 'File management operations',
      },
      {
        name: 'Upload',
        description: 'File upload operations',
      },
      {
        name: 'Images',
        description: 'Image processing operations',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/index.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; }
  `,
  customSiteTitle: 'UltraMarket File Service API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};