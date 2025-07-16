import express from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller';

const router = express.Router();
const fileController = new FileController();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now, can be restricted based on needs
    cb(null, true);
  },
});

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List files
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: List of files
 */
router.get('/', fileController.listFiles.bind(fileController));

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File data
 *       404:
 *         description: File not found
 */
router.get('/:id', fileController.getFile.bind(fileController));

/**
 * @swagger
 * /api/files:
 *   post:
 *     summary: Upload file
 *     tags: [Files]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', upload.single('file'), fileController.uploadFile.bind(fileController));

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: Update file metadata
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: File updated successfully
 */
router.put('/:id', fileController.updateFile.bind(fileController));

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/:id', fileController.deleteFile.bind(fileController));

export default router;