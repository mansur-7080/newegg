import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3018;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'file-service',
    timestamp: new Date().toISOString(),
  });
});

// File management endpoints
app.post('/api/v1/files/upload', (req, res) => {
  const { fileName, fileType, fileSize } = req.body;
  res.status(201).json({
    message: 'Upload file',
    data: {
      fileId: 'file_' + Date.now(),
      fileName,
      fileType,
      fileSize,
      uploadUrl: `https://storage.ultramarket.com/uploads/${fileName}`,
      downloadUrl: `https://cdn.ultramarket.com/files/${fileName}`,
      status: 'uploaded',
      uploadedAt: new Date().toISOString()
    }
  });
});

app.get('/api/v1/files/:fileId', (req, res) => {
  res.json({
    message: `Get file ${req.params.fileId}`,
    data: {
      fileId: req.params.fileId,
      fileName: 'sample-image.jpg',
      fileType: 'image/jpeg',
      fileSize: 2048576,
      downloadUrl: `https://cdn.ultramarket.com/files/${req.params.fileId}`,
      metadata: {
        width: 1920,
        height: 1080,
        createdAt: new Date().toISOString()
      }
    }
  });
});

app.delete('/api/v1/files/:fileId', (req, res) => {
  res.json({
    message: `Delete file ${req.params.fileId}`,
    data: {
      fileId: req.params.fileId,
      deleted: true,
      deletedAt: new Date().toISOString()
    }
  });
});

app.post('/api/v1/files/:fileId/resize', (req, res) => {
  const { width, height, quality } = req.body;
  res.json({
    message: `Resize file ${req.params.fileId}`,
    data: {
      originalFileId: req.params.fileId,
      resizedFileId: 'file_' + Date.now() + '_resized',
      dimensions: { width, height },
      quality,
      downloadUrl: `https://cdn.ultramarket.com/files/resized/${req.params.fileId}`
    }
  });
});

app.get('/api/v1/files/gallery/:category', (req, res) => {
  res.json({
    message: `Get files in category ${req.params.category}`,
    data: {
      category: req.params.category,
      files: [
        {
          fileId: 'file_1',
          fileName: 'product-image-1.jpg',
          thumbnailUrl: 'https://cdn.ultramarket.com/thumbs/file_1.jpg',
          downloadUrl: 'https://cdn.ultramarket.com/files/file_1.jpg'
        },
        {
          fileId: 'file_2',
          fileName: 'banner-image.png',
          thumbnailUrl: 'https://cdn.ultramarket.com/thumbs/file_2.png',
          downloadUrl: 'https://cdn.ultramarket.com/files/file_2.png'
        }
      ],
      total: 2
    }
  });
});

app.get('/api/v1/files/presigned-url', (req, res) => {
  const { fileName, fileType } = req.query;
  res.json({
    message: 'Generate presigned upload URL',
    data: {
      uploadUrl: `https://storage.ultramarket.com/presigned/${fileName}?signature=abc123`,
      fileId: 'file_' + Date.now(),
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`File Service running on port ${PORT}`);
});

export default app;