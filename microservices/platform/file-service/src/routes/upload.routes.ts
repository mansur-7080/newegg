import express from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller';

const router = express.Router();
const fileController = new FileController();

// Configure multer for different upload types
const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for batch uploads
    files: 10, // Max 10 files
  },
});

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for single large files
  },
});

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 */
router.post('/multiple', uploadMultiple.array('files', 10), fileController.uploadMultiple.bind(fileController));

/**
 * @swagger
 * /api/upload/chunked:
 *   post:
 *     summary: Upload file in chunks
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *               chunkIndex:
 *                 type: integer
 *               totalChunks:
 *                 type: integer
 *               fileId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 */
router.post('/chunked', uploadSingle.single('chunk'), fileController.uploadChunk.bind(fileController));

/**
 * @swagger
 * /api/upload/finalize:
 *   post:
 *     summary: Finalize chunked upload
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileId:
 *                 type: string
 *               totalChunks:
 *                 type: integer
 *               fileName:
 *                 type: string
 *     responses:
 *       200:
 *         description: File finalized successfully
 */
router.post('/finalize', fileController.finalizeUpload.bind(fileController));

/**
 * @swagger
 * /api/upload/progress/{fileId}:
 *   get:
 *     summary: Get upload progress
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload progress information
 */
router.get('/progress/:fileId', fileController.getUploadProgress.bind(fileController));

export default router;