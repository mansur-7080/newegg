const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3008;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadsDir));

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(uploadsDir, getUploadFolder(file.mimetype));
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get upload folder based on file type
function getUploadFolder(mimetype) {
  if (mimetype.startsWith('image/')) {
    return 'images';
  } else if (mimetype === 'application/pdf') {
    return 'documents';
  } else {
    return 'others';
  }
}

// In-memory file registry
const fileRegistry = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'file-service',
    timestamp: new Date().toISOString(),
    uploadsDirectory: uploadsDir,
    totalFiles: fileRegistry.size,
    features: ['image-upload', 'document-upload', 'file-serving', 'file-management']
  });
});

// Upload single file
app.post('/api/files/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = generateFileId();
    const fileData = {
      id: fileId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `${req.protocol}://${req.get('host')}/uploads/${getUploadFolder(req.file.mimetype)}/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
      metadata: {
        userId: req.body.userId || null,
        category: req.body.category || 'general',
        description: req.body.description || null
      }
    };

    fileRegistry.set(fileId, fileData);

    res.status(201).json({
      success: true,
      file: {
        id: fileData.id,
        originalName: fileData.originalName,
        filename: fileData.filename,
        mimetype: fileData.mimetype,
        size: fileData.size,
        url: fileData.url,
        uploadedAt: fileData.uploadedAt
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Upload multiple files
app.post('/api/files/upload-multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      const fileId = generateFileId();
      const fileData = {
        id: fileId,
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `${req.protocol}://${req.get('host')}/uploads/${getUploadFolder(file.mimetype)}/${file.filename}`,
        uploadedAt: new Date().toISOString(),
        metadata: {
          userId: req.body.userId || null,
          category: req.body.category || 'general',
          description: req.body.description || null
        }
      };

      fileRegistry.set(fileId, fileData);
      
      return {
        id: fileData.id,
        originalName: fileData.originalName,
        filename: fileData.filename,
        mimetype: fileData.mimetype,
        size: fileData.size,
        url: fileData.url,
        uploadedAt: fileData.uploadedAt
      };
    });

    res.status(201).json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'Multiple file upload failed' });
  }
});

// Get file info
app.get('/api/files/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const file = fileRegistry.get(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url: file.url,
      uploadedAt: file.uploadedAt,
      metadata: file.metadata
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// List files
app.get('/api/files', (req, res) => {
  try {
    const { category, mimetype, userId, limit = 50, page = 1 } = req.query;
    
    let files = Array.from(fileRegistry.values());

    // Apply filters
    if (category) {
      files = files.filter(file => file.metadata.category === category);
    }
    
    if (mimetype) {
      files = files.filter(file => file.mimetype.includes(mimetype));
    }
    
    if (userId) {
      files = files.filter(file => file.metadata.userId === userId);
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Pagination
    const total = files.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedFiles = files.slice(offset, offset + limitNum);

    // Clean response (remove sensitive path info)
    const cleanFiles = paginatedFiles.map(file => ({
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url: file.url,
      uploadedAt: file.uploadedAt,
      metadata: file.metadata
    }));

    res.json({
      files: cleanFiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Delete file
app.delete('/api/files/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const file = fileRegistry.get(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Remove from registry
    fileRegistry.delete(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get file statistics
app.get('/api/files/stats', (req, res) => {
  try {
    const files = Array.from(fileRegistry.values());
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      byMimetype: {},
      byCategory: {},
      uploadsByDay: {}
    };

    files.forEach(file => {
      // Count by mimetype
      const type = file.mimetype.split('/')[0];
      stats.byMimetype[type] = (stats.byMimetype[type] || 0) + 1;

      // Count by category
      const category = file.metadata.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by upload day
      const uploadDate = new Date(file.uploadedAt).toDateString();
      stats.uploadsByDay[uploadDate] = (stats.uploadsByDay[uploadDate] || 0) + 1;
    });

    // Convert total size to human readable
    stats.totalSizeFormatted = formatFileSize(stats.totalSize);

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get file statistics' });
  }
});

// Generate file ID
function generateFileId() {
  return 'FILE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create sample product images
function createSampleImages() {
  const sampleImages = [
    {
      id: 'IMG_IPHONE15_001',
      originalName: 'iphone-15-pro.jpg',
      filename: 'iphone-15-pro.jpg',
      mimetype: 'image/jpeg',
      size: 245760,
      url: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=500',
      uploadedAt: new Date().toISOString(),
      metadata: {
        category: 'product',
        description: 'iPhone 15 Pro product image'
      }
    },
    {
      id: 'IMG_SAMSUNG_001',
      originalName: 'samsung-galaxy-s24.jpg',
      filename: 'samsung-galaxy-s24.jpg',
      mimetype: 'image/jpeg',
      size: 198432,
      url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',
      uploadedAt: new Date().toISOString(),
      metadata: {
        category: 'product',
        description: 'Samsung Galaxy S24 product image'
      }
    },
    {
      id: 'IMG_MACBOOK_001',
      originalName: 'macbook-air-m3.jpg',
      filename: 'macbook-air-m3.jpg',
      mimetype: 'image/jpeg',
      size: 312576,
      url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500',
      uploadedAt: new Date().toISOString(),
      metadata: {
        category: 'product',
        description: 'MacBook Air M3 product image'
      }
    }
  ];

  sampleImages.forEach(image => {
    fileRegistry.set(image.id, image);
  });

  console.log(`📸 Created ${sampleImages.length} sample product images`);
}

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'UltraMarket File Service',
    version: '1.0.0',
    features: [
      'Single file upload',
      'Multiple file upload',
      'File serving',
      'File management',
      'Image optimization',
      'File statistics'
    ],
    supportedTypes: [
      'Images (JPEG, PNG, GIF, WebP)',
      'Documents (PDF)',
      'Text files'
    ],
    endpoints: [
      'GET /health',
      'POST /api/files/upload',
      'POST /api/files/upload-multiple',
      'GET /api/files/:fileId',
      'GET /api/files',
      'DELETE /api/files/:fileId',
      'GET /api/files/stats'
    ],
    maxFileSize: '10MB',
    totalFiles: fileRegistry.size
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 10 files allowed.' });
    }
  }
  
  console.error('File service error:', error);
  res.status(500).json({ error: error.message || 'Internal file service error' });
});

// Initialize and start server
function startServer() {
  createSampleImages();
  
  app.listen(PORT, () => {
    console.log(`📁 File Service running on port ${PORT}`);
    console.log(`📂 Uploads directory: ${uploadsDir}`);
    console.log(`📸 Sample images: ${fileRegistry.size} files`);
    console.log(`🔗 File serving URL: http://localhost:${PORT}/uploads/`);
  });
}

startServer();

module.exports = app;